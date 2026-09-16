import { z } from "zod";
import type { LoanStatus, Role } from "./index.js";
import type { LoanDto } from "./index.js";

export const LOAN_TRANSITIONS: Record<
  LoanStatus,
  Array<{ to: LoanStatus; roles: Role[] }>
> = {
  APPLIED: [
    { to: "SANCTIONED", roles: ["SANCTION", "ADMIN"] },
    { to: "REJECTED", roles: ["SANCTION", "ADMIN"] },
  ],
  SANCTIONED: [{ to: "DISBURSED", roles: ["DISBURSEMENT", "ADMIN"] }],
  DISBURSED: [{ to: "CLOSED", roles: [] }], // system-only
  REJECTED: [],
  CLOSED: [],
};

export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
  isRoleMismatch?: boolean;
}

export function canTransition(
  fromStatus: LoanStatus,
  toStatus: LoanStatus,
  role: Role,
): TransitionCheckResult {
  const availableTransitions = LOAN_TRANSITIONS[fromStatus];
  if (!availableTransitions || availableTransitions.length === 0) {
    return {
      allowed: false,
      reason: `Cannot transition loan from terminal state ${fromStatus}`,
      isRoleMismatch: false,
    };
  }

  const targetTransition = availableTransitions.find((t) => t.to === toStatus);
  if (!targetTransition) {
    return {
      allowed: false,
      reason: `Cannot transition loan from ${fromStatus} to ${toStatus}`,
      isRoleMismatch: false,
    };
  }

  if (role === "ADMIN" || targetTransition.roles.includes(role)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role ${role} is not authorized to transition loan from ${fromStatus} to ${toStatus}`,
    isRoleMismatch: true,
  };
}

export const loanRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Rejection reason must be at least 5 characters")
    .max(500, "Rejection reason cannot exceed 500 characters"),
});

export type LoanRejectInput = z.infer<typeof loanRejectSchema>;

export const loanSanctionSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
});

export type LoanSanctionInput = z.infer<typeof loanSanctionSchema>;

export const loanDisburseSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional(),
});

export type LoanDisburseInput = z.infer<typeof loanDisburseSchema>;

export interface OpsLoanBorrowerInfo {
  id: string;
  fullName: string;
  email: string;
}

export interface OpsLoanDto extends LoanDto {
  borrower?: OpsLoanBorrowerInfo;
}
