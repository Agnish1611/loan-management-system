import {
  LoanModel,
  type ILoan,
  type ILoanDocument,
  type IStatusHistoryItem,
} from "@/models/index.js";
import type { LoanStatus } from "@repo/types";

export class LoanRepository {
  async create(data: {
    loanReference: string;
    borrowerUserId: string;
    salarySlipDocumentId: string;
    principalPaise: number;
    tenureDays: number;
    annualInterestRateBps: number;
    interestPaise: number;
    totalRepaymentPaise: number;
    amountPaidPaise?: number;
    outstandingPaise: number;
    status?: LoanStatus;
    statusHistory: ILoan["statusHistory"];
    applicantSnapshot: ILoan["applicantSnapshot"];
  }): Promise<ILoanDocument> {
    return LoanModel.create(data);
  }

  async findById(id: string): Promise<ILoanDocument | null> {
    return LoanModel.findById(id).exec();
  }

  async findByReference(loanReference: string): Promise<ILoanDocument | null> {
    return LoanModel.findOne({ loanReference }).exec();
  }

  async findByBorrower(borrowerUserId: string): Promise<ILoanDocument[]> {
    return LoanModel.find({ borrowerUserId }).sort({ createdAt: -1 }).exec();
  }

  async findOpenLoanByBorrower(
    borrowerUserId: string,
  ): Promise<ILoanDocument | null> {
    return LoanModel.findOne({
      borrowerUserId,
      status: { $in: ["APPLIED", "SANCTIONED", "DISBURSED"] },
    }).exec();
  }

  async findByStatus(status: LoanStatus): Promise<ILoanDocument[]> {
    return LoanModel.find({ status }).sort({ createdAt: -1 }).exec();
  }

  async findQueueByStatus(status: LoanStatus): Promise<ILoanDocument[]> {
    return LoanModel.find({ status })
      .populate("borrowerUserId", "fullName email")
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    id: string,
    currentStatus: LoanStatus,
    newStatus: LoanStatus,
    historyItem: IStatusHistoryItem,
  ): Promise<ILoanDocument | null> {
    return LoanModel.findOneAndUpdate(
      { _id: id, status: currentStatus },
      {
        $set: { status: newStatus },
        $push: { statusHistory: historyItem },
      },
      { new: true },
    )
      .populate("borrowerUserId", "fullName email")
      .exec();
  }

  async existsByReference(loanReference: string): Promise<boolean> {
    const count = await LoanModel.countDocuments({ loanReference }).exec();
    return count > 0;
  }
}

export const loanRepository = new LoanRepository();
