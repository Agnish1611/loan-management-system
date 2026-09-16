import { Types } from "mongoose";
import { loanRepository, type LoanRepository } from "@/repositories/index.js";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "@/errors/index.js";
import {
  BorrowerProfileModel,
  UserModel,
  type ILoanDocument,
  type IStatusHistoryItem,
} from "@/models/index.js";
import {
  canTransition,
  type SanitizedUser,
  type LoanStatus,
  type Role,
  type OpsLoanDto,
  type OpsBorrowerProfileDto,
  type OpsLoansQueryInput,
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

    const [enriched] = await this.enrichOpsLoans([updated]);
    return enriched!;
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

    const [enriched] = await this.enrichOpsLoans([updated]);
    return enriched!;
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

    const [enriched] = await this.enrichOpsLoans([updated]);
    return enriched!;
  }

  async getSanctionQueue(
    status: LoanStatus = "APPLIED",
  ): Promise<OpsLoanDto[]> {
    const loans = await this.loanRepo.findQueueByStatus(status);
    return this.enrichOpsLoans(loans);
  }

  async getDisbursementQueue(
    status: LoanStatus = "SANCTIONED",
  ): Promise<OpsLoanDto[]> {
    const loans = await this.loanRepo.findQueueByStatus(status);
    return this.enrichOpsLoans(loans);
  }

  async getCollectionQueue(): Promise<OpsLoanDto[]> {
    const loans = await this.loanRepo.findQueueByStatus("DISBURSED");
    return this.enrichOpsLoans(loans);
  }

  async getAllLoans(query?: OpsLoansQueryInput): Promise<OpsLoanDto[]> {
    let loans = await this.loanRepo.findAllLoans(query?.status);
    if (query?.search) {
      const s = query.search.toLowerCase();
      loans = loans.filter((l) => {
        const refMatch = l.loanReference.toLowerCase().includes(s);
        const borrower = l.borrowerUserId as unknown as {
          fullName?: string;
          email?: string;
        };
        const nameMatch = borrower?.fullName?.toLowerCase().includes(s);
        const emailMatch = borrower?.email?.toLowerCase().includes(s);
        return refMatch || nameMatch || emailMatch;
      });
    }
    return this.enrichOpsLoans(loans);
  }

  async getOpsLoanById(loanId: string): Promise<OpsLoanDto> {
    const loan = await this.loanRepo.findOpsLoanById(loanId);
    if (!loan) {
      throw new NotFoundError(`Loan with ID ${loanId} not found`);
    }
    const [enriched] = await this.enrichOpsLoans([loan]);
    if (!enriched) {
      throw new NotFoundError(`Loan with ID ${loanId} not found`);
    }
    return enriched;
  }

  async getRecentActivity(limit = 10): Promise<
    Array<{
      loanId: string;
      loanReference: string;
      borrowerName: string;
      from: LoanStatus | null;
      to: LoanStatus;
      byUserId: string | null;
      byUserName?: string | null;
      byUserRole?: Role | null;
      reason: string | null;
      at: string;
    }>
  > {
    const loans = await this.loanRepo.findAllLoans();
    const enriched = await this.enrichOpsLoans(loans);
    const events: Array<{
      loanId: string;
      loanReference: string;
      borrowerName: string;
      from: LoanStatus | null;
      to: LoanStatus;
      byUserId: string | null;
      byUserName?: string | null;
      byUserRole?: Role | null;
      reason: string | null;
      at: string;
    }> = [];

    for (const l of enriched) {
      for (const h of l.statusHistory) {
        events.push({
          loanId: l.id,
          loanReference: l.loanReference,
          borrowerName: l.borrower?.fullName || "Borrower",
          from: h.from,
          to: h.to,
          byUserId: h.byUserId,
          byUserName: h.byUserName,
          byUserRole: h.byUserRole,
          reason: h.reason,
          at: h.at,
        });
      }
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return events.slice(0, limit);
  }

  public async enrichOpsLoans(loans: ILoanDocument[]): Promise<OpsLoanDto[]> {
    if (loans.length === 0) return [];

    const borrowerIds = Array.from(
      new Set(
        loans.map((l) => {
          const b = l.borrowerUserId as unknown as { _id?: Types.ObjectId };
          return b && b._id ? b._id.toString() : l.borrowerUserId.toString();
        }),
      ),
    );

    const byUserIds: string[] = [];
    for (const l of loans) {
      for (const h of l.statusHistory) {
        if (h.byUserId) {
          byUserIds.push(h.byUserId.toString());
        }
      }
    }
    const allUserIds = Array.from(new Set([...byUserIds, ...borrowerIds]));

    const [profiles, users] = await Promise.all([
      BorrowerProfileModel.find({
        userId: { $in: borrowerIds.map((id) => new Types.ObjectId(id)) },
      }).exec(),
      UserModel.find(
        { _id: { $in: allUserIds.map((id) => new Types.ObjectId(id)) } },
        "fullName email role",
      ).exec(),
    ]);

    const profileMap = new Map<string, OpsBorrowerProfileDto>();
    for (const p of profiles) {
      profileMap.set(p.userId.toString(), {
        panNumber: p.panNumber,
        dateOfBirth: p.dateOfBirth.toISOString(),
        monthlySalaryPaise: p.monthlySalaryPaise,
        employmentMode: p.employmentMode,
        bre: p.bre,
      });
    }

    const userMap = new Map<
      string,
      { fullName: string; email: string; role: Role }
    >();
    for (const u of users) {
      userMap.set(u._id.toString(), {
        fullName: u.fullName,
        email: u.email,
        role: u.role,
      });
    }

    return loans.map((l) => this.formatOpsLoan(l, profileMap, userMap));
  }

  public formatOpsLoan(
    doc: ILoanDocument,
    profileMap?: Map<string, OpsBorrowerProfileDto>,
    userMap?: Map<string, { fullName: string; email: string; role: Role }>,
  ): OpsLoanDto {
    const populatedBorrower = doc.borrowerUserId as unknown as {
      _id?: Types.ObjectId;
      fullName?: string;
      email?: string;
    };

    const borrowerId =
      populatedBorrower && populatedBorrower._id
        ? populatedBorrower._id.toString()
        : doc.borrowerUserId.toString();

    const profile = profileMap?.get(borrowerId) ?? null;
    const borrowerUser = userMap?.get(borrowerId);
    const fullName = populatedBorrower?.fullName || borrowerUser?.fullName;
    const email = populatedBorrower?.email || borrowerUser?.email;

    const borrowerInfo =
      fullName && email
        ? {
            id: borrowerId,
            fullName,
            email,
            profile,
          }
        : undefined;

    return {
      id: doc._id.toString(),
      loanReference: doc.loanReference,
      borrowerUserId: borrowerId,
      salarySlipDocumentId: doc.salarySlipDocumentId.toString(),
      principalPaise: doc.principalPaise,
      tenureDays: doc.tenureDays,
      annualInterestRateBps: doc.annualInterestRateBps,
      interestPaise: doc.interestPaise,
      totalRepaymentPaise: doc.totalRepaymentPaise,
      amountPaidPaise: doc.amountPaidPaise,
      outstandingPaise: doc.outstandingPaise,
      status: doc.status,
      statusHistory: doc.statusHistory.map((h) => {
        const uId = h.byUserId ? h.byUserId.toString() : null;
        const op = uId && userMap ? userMap.get(uId) : null;
        return {
          from: h.from,
          to: h.to,
          byUserId: uId,
          byUserName: op?.fullName ?? null,
          byUserRole: op?.role ?? null,
          byUserEmail: op?.email ?? null,
          reason: h.reason,
          at: h.at.toISOString(),
        };
      }),
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
