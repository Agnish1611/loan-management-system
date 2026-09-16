import { z } from "zod";

export const ROLES = [
  "ADMIN",
  "SALES",
  "SANCTION",
  "DISBURSEMENT",
  "COLLECTION",
  "BORROWER",
] as const;

export type Role = (typeof ROLES)[number];

export const LOAN_STATUSES = [
  "APPLIED",
  "SANCTIONED",
  "REJECTED",
  "DISBURSED",
  "CLOSED",
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const EMPLOYMENT_MODES = [
  "SALARIED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
] as const;

export type EmploymentMode = (typeof EMPLOYMENT_MODES)[number];

export const DOCUMENT_TYPES = ["SALARY_SLIP"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type StorageProvider = "LOCAL" | "S3";

export interface DocumentDto {
  id: string;
  ownerUserId: string;
  docType: DocumentType;
  provider: StorageProvider;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface SanitizedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: SanitizedUser;
  token: string;
}

export interface HealthCheckResponse {
  status: "ok";
  uptime: number;
  timestamp: string;
  service: string;
}

export * from "./money.js";
export * from "./bre.js";

export const borrowerProfileUpsertSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]$/,
      "Invalid PAN format. Must be 5 uppercase letters, 4 digits, and 1 letter",
    ),
  dateOfBirth: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      "Invalid date format for date of birth",
    ),
  monthlySalary: z.number().min(0, "Monthly salary must be a positive number"),
  employmentMode: z.enum(EMPLOYMENT_MODES),
});

export type BorrowerProfileUpsertInput = z.infer<
  typeof borrowerProfileUpsertSchema
>;

export interface BorrowerProfileDto {
  id: string;
  userId: string;
  panNumber: string;
  dateOfBirth: string;
  monthlySalaryPaise: number;
  employmentMode: EmploymentMode;
  bre: import("./bre.js").BreVerdict;
  createdAt: string;
  updatedAt: string;
}

export * from "./loanMath.js";

export const loanQuoteSchema = z.object({
  principalRupees: z.coerce
    .number()
    .min(50000, "Principal must be at least ₹50,000")
    .max(500000, "Principal cannot exceed ₹500,000"),
  tenureDays: z.coerce
    .number()
    .int("Tenure must be an integer number of days")
    .min(30, "Tenure must be at least 30 days")
    .max(365, "Tenure cannot exceed 365 days"),
});

export type LoanQuoteInput = z.infer<typeof loanQuoteSchema>;

export const loanApplySchema = z.object({
  principalRupees: z
    .number()
    .min(50000, "Principal must be at least ₹50,000")
    .max(500000, "Principal cannot exceed ₹500,000"),
  tenureDays: z
    .number()
    .int("Tenure must be an integer number of days")
    .min(30, "Tenure must be at least 30 days")
    .max(365, "Tenure cannot exceed 365 days"),
  salarySlipDocumentId: z
    .string()
    .trim()
    .min(1, "Salary slip document ID is required"),
});

export type LoanApplyInput = z.infer<typeof loanApplySchema>;

export interface LoanStatusHistoryItem {
  from: LoanStatus | null;
  to: LoanStatus;
  byUserId: string | null;
  reason: string | null;
  at: string;
}

export interface ApplicantSnapshot {
  monthlySalaryPaise: number;
  employmentMode: EmploymentMode;
  ageAtApplication: number;
}

export interface LoanDto {
  id: string;
  loanReference: string;
  borrowerUserId: string;
  salarySlipDocumentId: string;
  principalPaise: number;
  tenureDays: number;
  annualInterestRateBps: number;
  interestPaise: number;
  totalRepaymentPaise: number;
  amountPaidPaise: number;
  outstandingPaise: number;
  status: LoanStatus;
  statusHistory: LoanStatusHistoryItem[];
  applicantSnapshot: ApplicantSnapshot;
  createdAt: string;
  updatedAt: string;
}

export * from "./workflow.js";
export * from "./payment.js";
export * from "./sales.js";
