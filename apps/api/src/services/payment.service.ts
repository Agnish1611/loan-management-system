import {
  paymentRepository,
  type PaymentRepository,
  loanRepository,
  type LoanRepository,
} from "@/repositories/index.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "@/errors/index.js";
import { loanWorkflowService } from "@/services/loan-workflow.service.js";
import type { IPaymentDocument, IStatusHistoryItem } from "@/models/index.js";
import {
  formatPaymentDto,
  fromPaise,
  type PaymentRecordInput,
  type PaymentDto,
  type PaymentRecordResponse,
  type OpsLoanDto,
  type SanitizedUser,
} from "@repo/types";

export class PaymentService {
  constructor(
    private paymentRepo: PaymentRepository = paymentRepository,
    private loanRepo: LoanRepository = loanRepository,
  ) {}

  async recordPayment(
    loanId: string,
    input: PaymentRecordInput,
    currentUser: SanitizedUser,
  ): Promise<PaymentRecordResponse> {
    const paidAtDate = new Date(input.paidAt);
    if (paidAtDate.getTime() > Date.now()) {
      throw new ValidationError("Payment date cannot be in the future");
    }

    const loan = await this.loanRepo.findById(loanId);
    if (!loan) {
      throw new NotFoundError("Loan not found");
    }

    if (loan.status !== "DISBURSED") {
      throw new ConflictError(
        `Cannot record payment on loan in ${loan.status} status. Only DISBURSED loans accept repayments.`,
      );
    }

    if (input.amountPaise > loan.outstandingPaise) {
      throw new ValidationError(
        `Payment amount (₹${fromPaise(input.amountPaise)}) exceeds outstanding balance (₹${fromPaise(loan.outstandingPaise)})`,
      );
    }

    const existingUtr = await this.paymentRepo.findByUtr(input.utrNumber);
    if (existingUtr) {
      throw new ConflictError(
        `Payment with UTR number ${input.utrNumber} has already been recorded`,
      );
    }

    const outstandingAfterPaise = loan.outstandingPaise - input.amountPaise;

    let paymentDoc: IPaymentDocument;
    try {
      paymentDoc = await this.paymentRepo.create({
        loanId,
        utrNumber: input.utrNumber,
        amountPaise: input.amountPaise,
        paidAt: paidAtDate,
        recordedByUserId: currentUser.id,
        outstandingAfterPaise,
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictError(
          `Payment with UTR number ${input.utrNumber} has already been recorded`,
        );
      }
      throw err;
    }

    // Atomic conditional debit on loan balance
    const updatedLoan = await this.loanRepo.atomicDebit(
      loanId,
      input.amountPaise,
    );

    if (!updatedLoan) {
      // Compensating cleanup on concurrent balance modification race
      await this.paymentRepo.deleteById(paymentDoc._id.toString());
      throw new ConflictError(
        "Payment could not be processed due to a concurrent balance update or status change. Please reload and try again.",
      );
    }

    // Auto-close loan if balance is exactly 0
    let finalLoanDoc = updatedLoan;
    if (updatedLoan.outstandingPaise === 0) {
      const closeHistoryItem: IStatusHistoryItem = {
        from: "DISBURSED",
        to: "CLOSED",
        byUserId: null, // system-triggered auto-close
        reason: "Fully repaid. Auto-closed by system.",
        at: new Date(),
      };

      const closedLoan = await this.loanRepo.autoClose(
        loanId,
        closeHistoryItem,
      );
      if (closedLoan) {
        finalLoanDoc = closedLoan;
      }
    }

    return {
      message:
        finalLoanDoc.status === "CLOSED"
          ? "Payment recorded successfully. Loan is fully repaid and closed."
          : "Payment recorded successfully",
      payment: formatPaymentDto(paymentDoc),
      loan: loanWorkflowService.formatOpsLoan(finalLoanDoc),
    };
  }

  async getLoanPayments(
    loanId: string,
    currentUser: SanitizedUser,
  ): Promise<PaymentDto[]> {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) {
      throw new NotFoundError("Loan not found");
    }

    if (
      currentUser.role === "BORROWER" &&
      loan.borrowerUserId.toString() !== currentUser.id
    ) {
      throw new ForbiddenError(
        "Access denied to payment history for this loan",
      );
    }

    const payments = await this.paymentRepo.findByLoanId(loanId);
    return payments.map((p) => formatPaymentDto(p));
  }

  async getCollectionQueue(): Promise<OpsLoanDto[]> {
    const loans = await this.loanRepo.findQueueByStatus("DISBURSED");
    return loans.map((l) => loanWorkflowService.formatOpsLoan(l));
  }
}

export const paymentService = new PaymentService();
