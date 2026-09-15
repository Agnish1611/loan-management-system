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

export type DocumentType = "SALARY_SLIP";

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
