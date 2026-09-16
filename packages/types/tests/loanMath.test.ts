import { describe, it, expect } from "vitest";
import {
  calculateLoanTerms,
  calculateLoanTermsFromRupees,
  LOAN_CONFIG,
} from "../src/index.js";

describe("Loan Math & Simple Interest Calculations", () => {
  it("matches the exact specification spot-check for 365 days", () => {
    // ₹100,000 for 365 days at fixed 12% p.a.
    const result = calculateLoanTermsFromRupees(100000, 365);

    expect(result.principalPaise).toBe(10000000);
    expect(result.principalRupees).toBe(100000);
    expect(result.annualInterestRateBps).toBe(1200);

    // Interest = (100,000 * 12 * 365) / (365 * 100) = 12,000 Rupees = 1,200,000 paise
    expect(result.interestPaise).toBe(1200000);
    expect(result.interestRupees).toBe(12000);

    // Total Repayment = 100,000 + 12,000 = 112,000 Rupees = 11,200,000 paise
    expect(result.totalRepaymentPaise).toBe(11200000);
    expect(result.totalRepaymentRupees).toBe(112000);
  });

  it("matches the exact specification spot-check for 30 days with half-up paise rounding", () => {
    // ₹100,000 for 30 days at 12% p.a.
    const result = calculateLoanTermsFromRupees(100000, 30);

    // Interest = (10,000,000 * 12 * 30) / 36,500 = 98,630.1369... paise -> rounded half-up: 98,630 paise (₹986.30)
    expect(result.interestPaise).toBe(98630);
    expect(result.interestRupees).toBe(986.3);

    // Total Repayment = 10,000,000 + 98,630 = 10,098,630 paise (₹100,986.30)
    expect(result.totalRepaymentPaise).toBe(10098630);
    expect(result.totalRepaymentRupees).toBe(100986.3);
  });

  it("calculates minimum allowed loan boundary (₹50,000, 30 days)", () => {
    const result = calculateLoanTermsFromRupees(
      LOAN_CONFIG.MIN_PRINCIPAL_RUPEES,
      LOAN_CONFIG.MIN_TENURE_DAYS,
    );

    expect(result.principalPaise).toBe(5000000);
    // Interest = (5,000,000 * 12 * 30) / 36,500 = 49,315.068... -> 49,315 paise
    expect(result.interestPaise).toBe(49315);
    expect(result.totalRepaymentPaise).toBe(5049315);
  });

  it("calculates maximum allowed loan boundary (₹500,000, 365 days)", () => {
    const result = calculateLoanTermsFromRupees(
      LOAN_CONFIG.MAX_PRINCIPAL_RUPEES,
      LOAN_CONFIG.MAX_TENURE_DAYS,
    );

    expect(result.principalPaise).toBe(50000000);
    // Interest = (50,000,000 * 12 * 365) / 36,500 = 6,000,000 paise (₹60,000)
    expect(result.interestPaise).toBe(6000000);
    expect(result.totalRepaymentPaise).toBe(56000000);
  });

  it("produces consistent results directly from paise input", () => {
    const fromPaiseInput = calculateLoanTerms({
      principalPaise: 25000000, // ₹250,000
      tenureDays: 180,
    });

    const fromRupeesInput = calculateLoanTermsFromRupees(250000, 180);

    expect(fromPaiseInput).toEqual(fromRupeesInput);
    expect(Number.isInteger(fromPaiseInput.interestPaise)).toBe(true);
    expect(Number.isInteger(fromPaiseInput.totalRepaymentPaise)).toBe(true);
  });
});
