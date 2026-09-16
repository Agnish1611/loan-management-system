import { describe, it, expect } from "vitest";
import { salesLeadQuerySchema, formatSalesLeadDto } from "../src/index.js";

describe("Sales Lead Schema & DTO Formatting", () => {
  describe("salesLeadQuerySchema", () => {
    it("defaults stage to ALL when no query parameters are provided", () => {
      const parsed = salesLeadQuerySchema.parse({});
      expect(parsed.stage).toBe("ALL");
      expect(parsed.search).toBeUndefined();
    });

    it("parses valid stages correctly", () => {
      expect(
        salesLeadQuerySchema.parse({ stage: "REGISTERED_ONLY" }).stage,
      ).toBe("REGISTERED_ONLY");
      expect(salesLeadQuerySchema.parse({ stage: "PROFILE_DONE" }).stage).toBe(
        "PROFILE_DONE",
      );
      expect(salesLeadQuerySchema.parse({ stage: "BRE_REJECTED" }).stage).toBe(
        "BRE_REJECTED",
      );
      expect(salesLeadQuerySchema.parse({ stage: "ALL" }).stage).toBe("ALL");
    });

    it("rejects invalid stage values", () => {
      expect(() =>
        salesLeadQuerySchema.parse({ stage: "INVALID_STAGE" }),
      ).toThrow();
      expect(() =>
        salesLeadQuerySchema.parse({ stage: "DISBURSED" }),
      ).toThrow();
    });

    it("trims search string when present", () => {
      const parsed = salesLeadQuerySchema.parse({
        stage: "PROFILE_DONE",
        search: "  Rahul Sharma  ",
      });
      expect(parsed.search).toBe("Rahul Sharma");
    });
  });

  describe("formatSalesLeadDto", () => {
    it("formats REGISTERED_ONLY lead with no profile", () => {
      const dto = formatSalesLeadDto({
        _id: "66e2c914e9f73a11b8180001",
        fullName: "Priya Patel",
        email: "priya@creditsea.com",
        createdAt: new Date("2026-09-10T10:00:00Z"),
        stage: "REGISTERED_ONLY",
        profile: null,
      });

      expect(dto.userId).toBe("66e2c914e9f73a11b8180001");
      expect(dto.fullName).toBe("Priya Patel");
      expect(dto.stage).toBe("REGISTERED_ONLY");
      expect(dto.profile).toBeUndefined();
      expect(dto.bre).toBeUndefined();
    });

    it("formats PROFILE_DONE lead with complete profile and passed BRE", () => {
      const dto = formatSalesLeadDto({
        _id: "66e2c914e9f73a11b8180002",
        fullName: "Rahul Sharma",
        email: "rahul@creditsea.com",
        createdAt: new Date("2026-09-12T10:00:00Z"),
        stage: "PROFILE_DONE",
        profile: {
          panNumber: "ABCDE1234F",
          dateOfBirth: new Date("1995-05-15"),
          monthlySalaryPaise: 7500000,
          employmentMode: "SALARIED",
          bre: {
            passed: true,
            evaluatedAt: new Date("2026-09-12T10:05:00Z"),
            ageAtEvaluation: 31,
            results: [
              { rule: "PAN", passed: true, message: "Valid PAN format" },
              { rule: "AGE", passed: true, message: "Age criteria met" },
            ],
          },
        },
      });

      expect(dto.userId).toBe("66e2c914e9f73a11b8180002");
      expect(dto.stage).toBe("PROFILE_DONE");
      expect(dto.profile?.panNumber).toBe("ABCDE1234F");
      expect(dto.profile?.monthlySalaryRupees).toBe(75000);
      expect(dto.bre?.passed).toBe(true);
      expect(dto.bre?.results).toHaveLength(2);
    });
  });
});
