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
