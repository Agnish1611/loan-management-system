import { randomBytes } from "crypto";
import { Types } from "mongoose";
import {
  loanRepository,
  type LoanRepository,
  borrowerProfileRepository,
  type BorrowerProfileRepository,
  documentRepository,
  type DocumentRepository,
} from "@/repositories/index.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "@/errors/index.js";
import type { ILoanDocument } from "@/models/index.js";
import {
  calculateLoanTermsFromRupees,
  type LoanQuoteInput,
  type LoanApplyInput,
  type LoanDto,
  type LoanCalculationResult,
  type Role,
} from "@repo/types";

export class LoanService {
  constructor(
    private loanRepo: LoanRepository = loanRepository,
    private borrowerRepo: BorrowerProfileRepository = borrowerProfileRepository,
    private docRepo: DocumentRepository = documentRepository,
  ) {}

  getQuote(input: LoanQuoteInput): LoanCalculationResult {
    return calculateLoanTermsFromRupees(
      input.principalRupees,
      input.tenureDays,
    );
  }

  async apply(borrowerUserId: string, input: LoanApplyInput): Promise<LoanDto> {
    // 1. Verify borrower profile exists
    const profile = await this.borrowerRepo.findByUserId(borrowerUserId);
    if (!profile) {
      throw new ValidationError(
        "Please complete your personal details and eligibility check before applying for a loan",
      );
    }

    // 2. Verify BRE verdict passed
    if (!profile.bre?.passed) {
      throw new ValidationError(
        "Borrower profile did not meet credit eligibility requirements",
      );
    }

    // 3. Verify salary slip document exists and belongs to this borrower
    const document = await this.docRepo.findById(input.salarySlipDocumentId);
    if (!document || document.ownerUserId.toString() !== borrowerUserId) {
      throw new ValidationError(
        "A valid salary slip document uploaded by you is required",
      );
    }

    // 4. Verify borrower has no active/open loan
    const openLoan = await this.loanRepo.findOpenLoanByBorrower(borrowerUserId);
    if (openLoan) {
      throw new ConflictError(
        "You already have an active loan application or disbursed loan. Borrowers can only have one open loan at a time.",
      );
    }

    // 5. Calculate terms in paise
    const terms = calculateLoanTermsFromRupees(
      input.principalRupees,
      input.tenureDays,
    );

    // 6. Generate unique speakable loan reference
    const loanReference = await this.generateUniqueLoanReference();

    // 7. Freeze applicant snapshot and initial status history
    const applicantSnapshot = {
      monthlySalaryPaise: profile.monthlySalaryPaise,
      employmentMode: profile.employmentMode,
      ageAtApplication: profile.bre.ageAtEvaluation,
    };

    const initialHistory = [
      {
        from: null,
        to: "APPLIED" as const,
        byUserId: new Types.ObjectId(borrowerUserId),
        reason: null,
        at: new Date(),
      },
    ];

    // 8. Persist loan
    try {
      const loan = await this.loanRepo.create({
        loanReference,
        borrowerUserId,
        salarySlipDocumentId: input.salarySlipDocumentId,
        principalPaise: terms.principalPaise,
        tenureDays: terms.tenureDays,
        annualInterestRateBps: terms.annualInterestRateBps,
        interestPaise: terms.interestPaise,
        totalRepaymentPaise: terms.totalRepaymentPaise,
        outstandingPaise: terms.totalRepaymentPaise,
        amountPaidPaise: 0,
        status: "APPLIED",
        statusHistory: initialHistory,
        applicantSnapshot,
      });

      return this.formatLoan(loan);
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictError(
          "An active loan application is already open for this borrower",
        );
      }
      throw err;
    }
  }

  async getMyLoans(borrowerUserId: string): Promise<LoanDto[]> {
    const loans = await this.loanRepo.findByBorrower(borrowerUserId);
    return loans.map((l) => this.formatLoan(l));
  }

  async getLoanById(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<LoanDto> {
    const loan = await this.loanRepo.findById(id);
    if (!loan) {
      throw new NotFoundError("Loan not found");
    }

    // RBAC: Borrower can only access their own loan; executive roles can access all loans
    if (
      currentUser.role === "BORROWER" &&
      loan.borrowerUserId.toString() !== currentUser.id
    ) {
      throw new ForbiddenError("Access denied to this loan");
    }

    return this.formatLoan(loan);
  }

  public async generateUniqueLoanReference(): Promise<string> {
    const year = new Date().getFullYear();
    for (let attempts = 0; attempts < 10; attempts++) {
      const randomSuffix = randomBytes(3).toString("hex").toUpperCase();
      const reference = `LN-${year}-${randomSuffix}`;
      const exists = await this.loanRepo.existsByReference(reference);
      if (!exists) {
        return reference;
      }
    }
    return `LN-${year}-${Date.now().toString().slice(-6)}`;
  }

  public formatLoan(doc: ILoanDocument): LoanDto {
    return {
      id: doc._id.toString(),
      loanReference: doc.loanReference,
      borrowerUserId: doc.borrowerUserId.toString(),
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
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

export const loanService = new LoanService();
