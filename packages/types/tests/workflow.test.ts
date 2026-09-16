import { describe, it, expect } from "vitest";
import {
  LOAN_TRANSITIONS,
  canTransition,
  loanRejectSchema,
  loanSanctionSchema,
  loanDisburseSchema,
} from "../src/index.js";

describe("Loan State Machine & Workflow Transitions", () => {
  describe("canTransition", () => {
    it("allows SANCTION and ADMIN roles to transition APPLIED -> SANCTIONED", () => {
      expect(canTransition("APPLIED", "SANCTIONED", "SANCTION")).toEqual({
        allowed: true,
      });
      expect(canTransition("APPLIED", "SANCTIONED", "ADMIN")).toEqual({
        allowed: true,
      });
    });

    it("denies unauthorized roles from transitioning APPLIED -> SANCTIONED", () => {
      const result = canTransition("APPLIED", "SANCTIONED", "DISBURSEMENT");
      expect(result.allowed).toBe(false);
      expect(result.isRoleMismatch).toBe(true);

      const borrowerResult = canTransition("APPLIED", "SANCTIONED", "BORROWER");
      expect(borrowerResult.allowed).toBe(false);
      expect(borrowerResult.isRoleMismatch).toBe(true);
    });

    it("allows SANCTION and ADMIN roles to transition APPLIED -> REJECTED", () => {
      expect(canTransition("APPLIED", "REJECTED", "SANCTION")).toEqual({
        allowed: true,
      });
      expect(canTransition("APPLIED", "REJECTED", "ADMIN")).toEqual({
        allowed: true,
      });
    });

    it("denies unauthorized roles from transitioning APPLIED -> REJECTED", () => {
      const result = canTransition("APPLIED", "REJECTED", "SALES");
      expect(result.allowed).toBe(false);
      expect(result.isRoleMismatch).toBe(true);
    });

    it("allows DISBURSEMENT and ADMIN roles to transition SANCTIONED -> DISBURSED", () => {
      expect(canTransition("SANCTIONED", "DISBURSED", "DISBURSEMENT")).toEqual({
        allowed: true,
      });
      expect(canTransition("SANCTIONED", "DISBURSED", "ADMIN")).toEqual({
        allowed: true,
      });
    });

    it("denies SANCTION officer from transitioning SANCTIONED -> DISBURSED", () => {
      const result = canTransition("SANCTIONED", "DISBURSED", "SANCTION");
      expect(result.allowed).toBe(false);
      expect(result.isRoleMismatch).toBe(true);
    });

    it("rejects illegal skips in state progression as invalid transitions", () => {
      // Disbursing directly from APPLIED (skipping sanction)
      const skipToDisburse = canTransition("APPLIED", "DISBURSED", "ADMIN");
      expect(skipToDisburse.allowed).toBe(false);
      expect(skipToDisburse.isRoleMismatch).toBe(false);
      expect(skipToDisburse.reason).toMatch(
        /Cannot transition loan from APPLIED to DISBURSED/,
      );

      // Sanctioning an already DISBURSED loan
      const reverseTransition = canTransition(
        "DISBURSED",
        "SANCTIONED",
        "ADMIN",
      );
      expect(reverseTransition.allowed).toBe(false);
      expect(reverseTransition.isRoleMismatch).toBe(false);
    });

    it("treats REJECTED and CLOSED as terminal states allowing zero transitions", () => {
      expect(canTransition("REJECTED", "APPLIED", "ADMIN")).toEqual({
        allowed: false,
        reason: "Cannot transition loan from terminal state REJECTED",
        isRoleMismatch: false,
      });

      expect(canTransition("CLOSED", "DISBURSED", "ADMIN")).toEqual({
        allowed: false,
        reason: "Cannot transition loan from terminal state CLOSED",
        isRoleMismatch: false,
      });
    });
  });

  describe("Workflow Input Validation Schemas", () => {
    it("validates loanRejectSchema requiring reason between 5 and 500 characters", () => {
      expect(() =>
        loanRejectSchema.parse({
          reason: "Applicant debt-to-income ratio exceeds risk limits",
        }),
      ).not.toThrow();

      // Too short (< 5 chars)
      expect(() => loanRejectSchema.parse({ reason: "No" })).toThrow();

      // Empty string
      expect(() => loanRejectSchema.parse({ reason: "   " })).toThrow();

      // Missing reason
      expect(() => loanRejectSchema.parse({})).toThrow();

      // Exceeds 500 chars
      expect(() =>
        loanRejectSchema.parse({ reason: "x".repeat(501) }),
      ).toThrow();
    });

    it("validates optional notes in loanSanctionSchema and loanDisburseSchema", () => {
      expect(() => loanSanctionSchema.parse({})).not.toThrow();
      expect(() =>
        loanSanctionSchema.parse({ notes: "KYC and income criteria verified" }),
      ).not.toThrow();

      expect(() => loanDisburseSchema.parse({})).not.toThrow();
      expect(() =>
        loanDisburseSchema.parse({ notes: "Transferred via RTGS" }),
      ).not.toThrow();
    });
  });
});
