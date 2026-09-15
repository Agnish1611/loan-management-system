import type { EmploymentMode } from "./index.js";

export type BreRuleName = "PAN" | "AGE" | "SALARY" | "EMPLOYMENT";

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const BRE_CONFIG = {
  MIN_AGE: 23,
  MAX_AGE: 50,
  MIN_MONTHLY_SALARY: 25000,
} as const;

export interface BreInput {
  panNumber: string;
  dateOfBirth: Date | string;
  monthlySalary: number;
  employmentMode: EmploymentMode;
}

export interface BreRuleResult {
  rule: BreRuleName;
  passed: boolean;
  message: string;
}

export interface BreVerdict {
  passed: boolean;
  evaluatedAt: string;
  ageAtEvaluation: number;
  results: BreRuleResult[];
}

export function calculateAge(
  dob: Date | string,
  asOfDate: Date = new Date(),
): number {
  const birthDate = typeof dob === "string" ? new Date(dob) : dob;
  let age = asOfDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = asOfDate.getUTCMonth() - birthDate.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && asOfDate.getUTCDate() < birthDate.getUTCDate())
  ) {
    age--;
  }
  return age;
}

export function evaluateBre(
  input: BreInput,
  asOfDate: Date = new Date(),
): BreVerdict {
  const results: BreRuleResult[] = [];
  const normalizedPan = input.panNumber.trim().toUpperCase();

  // 1. PAN rule
  const panPassed = PAN_REGEX.test(normalizedPan);
  results.push({
    rule: "PAN",
    passed: panPassed,
    message: panPassed
      ? "PAN format is valid."
      : "Invalid PAN format. Must be 5 uppercase letters, 4 digits, and 1 letter.",
  });

  // 2. Age rule (inclusive 23-50)
  const age = calculateAge(input.dateOfBirth, asOfDate);
  const agePassed = age >= BRE_CONFIG.MIN_AGE && age <= BRE_CONFIG.MAX_AGE;
  results.push({
    rule: "AGE",
    passed: agePassed,
    message: agePassed
      ? `Age ${age} is within eligible bounds (23-50).`
      : `Applicant age must be between 23 and 50 years (inclusive). Current age: ${age}.`,
  });

  // 3. Salary rule (>= 25,000)
  const salaryPassed = input.monthlySalary >= BRE_CONFIG.MIN_MONTHLY_SALARY;
  results.push({
    rule: "SALARY",
    passed: salaryPassed,
    message: salaryPassed
      ? `Monthly salary meets minimum requirement.`
      : `Monthly salary must be at least ₹25,000. Provided: ₹${input.monthlySalary.toLocaleString("en-IN")}.`,
  });

  // 4. Employment rule
  const employmentPassed = input.employmentMode !== "UNEMPLOYED";
  results.push({
    rule: "EMPLOYMENT",
    passed: employmentPassed,
    message: employmentPassed
      ? `Employment mode (${input.employmentMode}) is eligible.`
      : "Applicant must be employed (Salaried or Self-Employed).",
  });

  const allPassed = results.every((r) => r.passed);

  return {
    passed: allPassed,
    evaluatedAt: asOfDate.toISOString(),
    ageAtEvaluation: age,
    results,
  };
}
