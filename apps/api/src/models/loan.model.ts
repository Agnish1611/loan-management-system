import { Schema, model, type Document, type Types } from "mongoose";
import {
  LOAN_STATUSES,
  EMPLOYMENT_MODES,
  type LoanStatus,
  type EmploymentMode,
} from "@repo/types";

export interface IStatusHistoryItem {
  from: LoanStatus | null;
  to: LoanStatus;
  byUserId: Types.ObjectId | null;
  reason: string | null;
  at: Date;
}

export interface IApplicantSnapshot {
  monthlySalaryPaise: number;
  employmentMode: EmploymentMode;
  ageAtApplication: number;
}

export interface ILoan {
  loanReference: string;
  borrowerUserId: Types.ObjectId;
  salarySlipDocumentId: Types.ObjectId;
  principalPaise: number;
  tenureDays: number;
  annualInterestRateBps: number;
  interestPaise: number;
  totalRepaymentPaise: number;
  amountPaidPaise: number;
  outstandingPaise: number;
  status: LoanStatus;
  statusHistory: IStatusHistoryItem[];
  applicantSnapshot: IApplicantSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoanDocument extends ILoan, Document<Types.ObjectId> {}

const statusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    from: {
      type: String,
      enum: [...LOAN_STATUSES, null],
      default: null,
    },
    to: {
      type: String,
      enum: LOAN_STATUSES,
      required: true,
    },
    byUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const applicantSnapshotSchema = new Schema<IApplicantSnapshot>(
  {
    monthlySalaryPaise: {
      type: Number,
      required: true,
    },
    employmentMode: {
      type: String,
      enum: EMPLOYMENT_MODES,
      required: true,
    },
    ageAtApplication: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const loanSchema = new Schema<ILoanDocument>(
  {
    loanReference: {
      type: String,
      required: true,
      unique: true,
    },
    borrowerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salarySlipDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    principalPaise: {
      type: Number,
      required: true,
      min: 5000000,
      max: 50000000,
    },
    tenureDays: {
      type: Number,
      required: true,
      min: 30,
      max: 365,
    },
    annualInterestRateBps: {
      type: Number,
      required: true,
      default: 1200,
    },
    interestPaise: {
      type: Number,
      required: true,
    },
    totalRepaymentPaise: {
      type: Number,
      required: true,
    },
    amountPaidPaise: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    outstandingPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: LOAN_STATUSES,
      default: "APPLIED",
      required: true,
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      required: true,
      default: [],
    },
    applicantSnapshot: {
      type: applicantSnapshotSchema,
      required: true,
    },
  },
  {
    collection: "loans",
    timestamps: true,
  },
);

// Indexes
loanSchema.index({ borrowerUserId: 1, createdAt: -1 });
loanSchema.index({ status: 1, createdAt: -1 });

// Partial unique index: enforces one open loan per borrower at the database level
loanSchema.index(
  { borrowerUserId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["APPLIED", "SANCTIONED", "DISBURSED"] },
    },
  },
);

export const LoanModel = model<ILoanDocument>("Loan", loanSchema);
