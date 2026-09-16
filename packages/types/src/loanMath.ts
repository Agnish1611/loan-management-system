import { fromPaise, toPaise } from "./money.js";

export const LOAN_CONFIG = {
  MIN_PRINCIPAL_RUPEES: 50000,
  MAX_PRINCIPAL_RUPEES: 500000,
  MIN_TENURE_DAYS: 30,
  MAX_TENURE_DAYS: 365,
  ANNUAL_INTEREST_RATE_PERCENT: 12,
  ANNUAL_INTEREST_RATE_BPS: 1200,
} as const;

export interface LoanCalculationInput {
  principalPaise: number;
  tenureDays: number;
  annualInterestRatePercent?: number;
}

export interface LoanCalculationResult {
  principalPaise: number;
  tenureDays: number;
  annualInterestRateBps: number;
  interestPaise: number;
  totalRepaymentPaise: number;
  principalRupees: number;
  interestRupees: number;
  totalRepaymentRupees: number;
}

export function calculateLoanTerms(
  input: LoanCalculationInput,
): LoanCalculationResult {
  const rate =
    input.annualInterestRatePercent ?? LOAN_CONFIG.ANNUAL_INTEREST_RATE_PERCENT;

  // Formula: SI = (P * R * T) / (365 * 100), rounded half-up to exact paise once
  const interestPaise = Math.round(
    (input.principalPaise * rate * input.tenureDays) / (365 * 100),
  );
  const totalRepaymentPaise = input.principalPaise + interestPaise;

  return {
    principalPaise: input.principalPaise,
    tenureDays: input.tenureDays,
    annualInterestRateBps: Math.round(rate * 100),
    interestPaise,
    totalRepaymentPaise,
    principalRupees: fromPaise(input.principalPaise),
    interestRupees: fromPaise(interestPaise),
    totalRepaymentRupees: fromPaise(totalRepaymentPaise),
  };
}

export function calculateLoanTermsFromRupees(
  principalRupees: number,
  tenureDays: number,
  annualInterestRatePercent?: number,
): LoanCalculationResult {
  return calculateLoanTerms({
    principalPaise: toPaise(principalRupees),
    tenureDays,
    annualInterestRatePercent,
  });
}
