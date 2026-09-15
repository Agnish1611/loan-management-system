import { describe, it, expect } from "vitest";
import {
  evaluateBre,
  calculateAge,
  toPaise,
  fromPaise,
  formatRupees,
} from "../src/index.js";

describe("Business Rule Engine (BRE) & Money Calculations", () => {
  const refDate = new Date("2026-06-15T00:00:00Z");

  describe("Money Utilities", () => {
    it("converts rupees to paise accurately without float inaccuracies", () => {
      expect(toPaise(25000)).toBe(2500000);
      expect(toPaise(99.99)).toBe(9999);
      expect(toPaise(0)).toBe(0);
    });

    it("converts paise to rupees accurately", () => {
      expect(fromPaise(2500000)).toBe(25000);
      expect(fromPaise(9999)).toBe(99.99);
    });

    it("formats paise into currency string", () => {
      const formatted = formatRupees(2500000);
      expect(formatted).toContain("25,000");
    });
  });

  describe("calculateAge", () => {
    it("calculates exact age accounting for whether birthday has occurred this year", () => {
      // Exactly 23 years old on refDate (June 15)
      expect(calculateAge(new Date("2003-06-15T00:00:00Z"), refDate)).toBe(23);

      // Birthday is tomorrow (June 16) -> still 22
      expect(calculateAge(new Date("2003-06-16T00:00:00Z"), refDate)).toBe(22);

      // Birthday was yesterday (June 14) -> turned 23
      expect(calculateAge(new Date("2003-06-14T00:00:00Z"), refDate)).toBe(23);

      // Exactly 50 years old
      expect(calculateAge(new Date("1976-06-15T00:00:00Z"), refDate)).toBe(50);

      // Turned 51 yesterday
      expect(calculateAge(new Date("1975-06-14T00:00:00Z"), refDate)).toBe(51);
    });
  });

  describe("evaluateBre - Individual Rule Verification", () => {
    const validBase = {
      panNumber: "ABCDE1234F",
      dateOfBirth: "1995-01-01",
      monthlySalary: 50000,
      employmentMode: "SALARIED" as const,
    };

    it("passes when all eligibility conditions are met", () => {
      const verdict = evaluateBre(validBase, refDate);
      expect(verdict.passed).toBe(true);
      expect(verdict.results.every((r) => r.passed)).toBe(true);
      expect(verdict.results).toHaveLength(4);
    });

    describe("PAN Rule", () => {
      it("accepts valid uppercase PAN", () => {
        const verdict = evaluateBre(
          { ...validBase, panNumber: "BNZPK1234A" },
          refDate,
        );
        const panResult = verdict.results.find((r) => r.rule === "PAN");
        expect(panResult?.passed).toBe(true);
      });

      it("normalizes and accepts valid lowercase PAN", () => {
        const verdict = evaluateBre(
          { ...validBase, panNumber: "bnzpk1234a" },
          refDate,
        );
        const panResult = verdict.results.find((r) => r.rule === "PAN");
        expect(panResult?.passed).toBe(true);
      });

      it("rejects invalid PAN format (wrong digit/character positions)", () => {
        const invalidPans = [
          "12345ABCDE",
          "ABC1234F",
          "ABCDEF1234",
          "ABCDE12345",
          "ABCDE-1234F",
        ];
        for (const pan of invalidPans) {
          const verdict = evaluateBre(
            { ...validBase, panNumber: pan },
            refDate,
          );
          const panResult = verdict.results.find((r) => r.rule === "PAN");
          expect(panResult?.passed).toBe(false);
          expect(verdict.passed).toBe(false);
        }
      });
    });

    describe("Age Rule (Inclusive 23 - 50)", () => {
      it("accepts lower boundary age of exactly 23", () => {
        const verdict = evaluateBre(
          { ...validBase, dateOfBirth: "2003-06-15" },
          refDate,
        );
        const ageResult = verdict.results.find((r) => r.rule === "AGE");
        expect(ageResult?.passed).toBe(true);
      });

      it("accepts upper boundary age of exactly 50", () => {
        const verdict = evaluateBre(
          { ...validBase, dateOfBirth: "1976-06-15" },
          refDate,
        );
        const ageResult = verdict.results.find((r) => r.rule === "AGE");
        expect(ageResult?.passed).toBe(true);
      });

      it("rejects applicants under 23", () => {
        const verdict = evaluateBre(
          { ...validBase, dateOfBirth: "2003-06-16" },
          refDate,
        );
        const ageResult = verdict.results.find((r) => r.rule === "AGE");
        expect(ageResult?.passed).toBe(false);
        expect(verdict.passed).toBe(false);
        expect(ageResult?.message).toContain("between 23 and 50");
      });

      it("rejects applicants over 50", () => {
        const verdict = evaluateBre(
          { ...validBase, dateOfBirth: "1975-06-15" },
          refDate,
        );
        const ageResult = verdict.results.find((r) => r.rule === "AGE");
        expect(ageResult?.passed).toBe(false);
        expect(verdict.passed).toBe(false);
      });
    });

    describe("Salary Rule (>= ₹25,000)", () => {
      it("accepts exact threshold salary of ₹25,000", () => {
        const verdict = evaluateBre(
          { ...validBase, monthlySalary: 25000 },
          refDate,
        );
        const salaryResult = verdict.results.find((r) => r.rule === "SALARY");
        expect(salaryResult?.passed).toBe(true);
      });

      it("accepts salaries above ₹25,000", () => {
        const verdict = evaluateBre(
          { ...validBase, monthlySalary: 150000 },
          refDate,
        );
        const salaryResult = verdict.results.find((r) => r.rule === "SALARY");
        expect(salaryResult?.passed).toBe(true);
      });

      it("rejects salaries below ₹25,000", () => {
        const verdict = evaluateBre(
          { ...validBase, monthlySalary: 24999 },
          refDate,
        );
        const salaryResult = verdict.results.find((r) => r.rule === "SALARY");
        expect(salaryResult?.passed).toBe(false);
        expect(verdict.passed).toBe(false);
        expect(salaryResult?.message).toContain("at least ₹25,000");
      });
    });

    describe("Employment Mode Rule", () => {
      it("accepts SALARIED employment mode", () => {
        const verdict = evaluateBre(
          { ...validBase, employmentMode: "SALARIED" },
          refDate,
        );
        const empResult = verdict.results.find((r) => r.rule === "EMPLOYMENT");
        expect(empResult?.passed).toBe(true);
      });

      it("accepts SELF_EMPLOYED employment mode", () => {
        const verdict = evaluateBre(
          { ...validBase, employmentMode: "SELF_EMPLOYED" },
          refDate,
        );
        const empResult = verdict.results.find((r) => r.rule === "EMPLOYMENT");
        expect(empResult?.passed).toBe(true);
      });

      it("rejects UNEMPLOYED employment mode", () => {
        const verdict = evaluateBre(
          { ...validBase, employmentMode: "UNEMPLOYED" },
          refDate,
        );
        const empResult = verdict.results.find((r) => r.rule === "EMPLOYMENT");
        expect(empResult?.passed).toBe(false);
        expect(verdict.passed).toBe(false);
        expect(empResult?.message).toContain("must be employed");
      });
    });

    describe("Multiple Failures Reporting", () => {
      it("diagnoses and returns all failed rules when multiple rules fail simultaneously", () => {
        const multiFailInput = {
          panNumber: "INVALID-PAN",
          dateOfBirth: "2005-01-01", // Under 23
          monthlySalary: 15000, // Under 25,000
          employmentMode: "UNEMPLOYED" as const,
        };

        const verdict = evaluateBre(multiFailInput, refDate);
        expect(verdict.passed).toBe(false);

        const failedRules = verdict.results.filter((r) => !r.passed);
        expect(failedRules).toHaveLength(4);
        expect(failedRules.map((r) => r.rule)).toEqual([
          "PAN",
          "AGE",
          "SALARY",
          "EMPLOYMENT",
        ]);
      });
    });
  });
});
