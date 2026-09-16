import { Types } from "mongoose";
import { loanRepository, type LoanRepository } from "@/repositories/index.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "@/errors/index.js";
import type { ILoanDocument, IStatusHistoryItem } from "@/models/index.js";
import {
  canTransition,
  type SanitizedUser,
  type LoanStatus,
  type OpsLoanDto,
} from "@repo/types";

export class LoanWorkflowService {
  constructor(private loanRepo: LoanRepository = loanRepository) {}

  async sanctionLoan(
    id: string,
    currentUser: SanitizedUser,
    notes?: string,
  ): Promise<OpsLoanDto> {
    const loan = await this.loanRepo.findById(id);
    if (!loan) {
      throw new NotFoundError("Loan not found");
    }

    const check = canTransition(loan.status, "SANCTIONED", currentUser.role);
    if (!check.allowed) {
      if (check.isRoleMismatch) {
        throw new ForbiddenError(
          check.reason || "Unauthorized to sanction loan",
        );
      }
      throw new ConflictError(
        check.reason || `Cannot sanction loan in ${loan.status} status`,
      );
    }

    const historyItem: IStatusHistoryItem = {
      from: loan.status,
      to: "SANCTIONED",
      byUserId: new Types.ObjectId(currentUser.id),
      reason: notes?.trim() || null,
      at: new Date(),
    };

    const updated = await this.loanRepo.updateStatus(
      id,
      loan.status,
      "SANCTIONED",
      historyItem,
    );

    if (!updated) {
      throw new ConflictError(
        "Loan status was modified concurrently. Please reload and try again.",
      );
    }

    return this.formatOpsLoan(updated);
  }

  async rejectLoan(
    id: string,
    currentUser: SanitizedUser,
    reason: string,
  ): Promise<OpsLoanDto> {
    if (
      !reason ||
      typeof reason !== "string" ||
      reason.trim().length < 5 ||
      reason.trim().length > 500
    ) {
      throw new ValidationError(
        "A valid rejection reason between 5 and 500 characters is required",
      );
    }

    const loan = await this.loanRepo.findById(id);
    if (!loan) {
      throw new NotFoundError("Loan not found");
    }

    const check = canTransition(loan.status, "REJECTED", currentUser.role);
    if (!check.allowed) {
      if (check.isRoleMismatch) {
        throw new ForbiddenError(check.reason || "Unauthorized to reject loan");
      }
      throw new ConflictError(
        check.reason || `Cannot reject loan in ${loan.status} status`,
      );
    }

    const historyItem: IStatusHistoryItem = {
      from: loan.status,
      to: "REJECTED",
      byUserId: new Types.ObjectId(currentUser.id),
      reason: reason.trim(),
      at: new Date(),
    };

    const updated = await this.loanRepo.updateStatus(
      id,
      loan.status,
      "REJECTED",
      historyItem,
    );

    if (!updated) {
      throw new ConflictError(
        "Loan status was modified concurrently. Please reload and try again.",
      );
    }

    return this.formatOpsLoan(updated);
  }

  async disburseLoan(
    id: string,
    currentUser: SanitizedUser,
    notes?: string,
  ): Promise<OpsLoanDto> {
    const loan = await this.loanRepo.findById(id);
    if (!loan) {
      throw new NotFoundError("Loan not found");
    }

    const check = canTransition(loan.status, "DISBURSED", currentUser.role);
    if (!check.allowed) {
      if (check.isRoleMismatch) {
        throw new ForbiddenError(
          check.reason || "Unauthorized to disburse loan",
        );
      }
      throw new ConflictError(
        check.reason || `Cannot disburse loan in ${loan.status} status`,
      );
    }

    const historyItem: IStatusHistoryItem = {
      from: loan.status,
      to: "DISBURSED",
      byUserId: new Types.ObjectId(currentUser.id),
      reason: notes?.trim() || null,
      at: new Date(),
    };

    const updated = await this.loanRepo.updateStatus(
      id,
      loan.status,
      "DISBURSED",
      historyItem,
    );

    if (!updated) {
      throw new ConflictError(
        "Loan status was modified concurrently. Please reload and try again.",
      );
    }

    return this.formatOpsLoan(updated);
  }

  async getSanctionQueue(
    status: LoanStatus = "APPLIED",
  ): Promise<OpsLoanDto[]> {
    const loans = await this.loanRepo.findQueueByStatus(status);
    return loans.map((l) => this.formatOpsLoan(l));
  }

  async getDisbursementQueue(
    status: LoanStatus = "SANCTIONED",
  ): Promise<OpsLoanDto[]> {
    const loans = await this.loanRepo.findQueueByStatus(status);
    return loans.map((l) => this.formatOpsLoan(l));
  }

  public formatOpsLoan(doc: ILoanDocument): OpsLoanDto {
    const populatedBorrower = doc.borrowerUserId as unknown as {
      _id?: Types.ObjectId;
      fullName?: string;
      email?: string;
    };

    const borrowerInfo =
      populatedBorrower && populatedBorrower.email && populatedBorrower.fullName
        ? {
            id:
              populatedBorrower._id?.toString() ||
              doc.borrowerUserId.toString(),
            fullName: populatedBorrower.fullName,
            email: populatedBorrower.email,
          }
        : undefined;

    return {
      id: doc._id.toString(),
      loanReference: doc.loanReference,
      borrowerUserId:
        populatedBorrower && populatedBorrower._id
          ? populatedBorrower._id.toString()
          : doc.borrowerUserId.toString(),
      salarySlipDocumentId: doc.salarySlipDocumentId.toString(),
      principalPaise: doc.principalPaise,
      tenureDays: doc.tenureDays,
      annualInterestRateBps: doc.annualInterestRateBps,
      interestPaise: doc.interestPaise,
      totalRepaymentPaise: doc.totalRepaymentPaise,
      amountPaidPaise: doc.amountPaidPaise,
      outstandingPaise: doc.outstandingPaise,
      status: doc.status,
      statusHistory: doc.statusHistory.map((h) => ({
        from: h.from,
        to: h.to,
        byUserId: h.byUserId ? h.byUserId.toString() : null,
        reason: h.reason,
        at: h.at.toISOString(),
      })),
      applicantSnapshot: {
        monthlySalaryPaise: doc.applicantSnapshot.monthlySalaryPaise,
        employmentMode: doc.applicantSnapshot.employmentMode,
        ageAtApplication: doc.applicantSnapshot.ageAtApplication,
      },
      borrower: borrowerInfo,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

export const loanWorkflowService = new LoanWorkflowService();
