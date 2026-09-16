import { describe, it, expect } from "vitest";
import { paymentRecordSchema, formatPaymentDto } from "../src/index.js";

describe("Payment Schema & Types Validation", () => {
  describe("paymentRecordSchema", () => {
    it("successfully parses valid payment payload and converts UTR to uppercase", () => {
      const parsed = paymentRecordSchema.parse({
        utrNumber: "hdfc1234567890",
        amountPaise: 5000000,
        paidAt: "2026-09-16T12:00:00.000Z",
      });

      expect(parsed.utrNumber).toBe("HDFC1234567890");
      expect(parsed.amountPaise).toBe(5000000);
      expect(parsed.paidAt).toBe("2026-09-16T12:00:00.000Z");
    });

    it("rejects when UTR number is missing or too short", () => {
      expect(() =>
        paymentRecordSchema.parse({
          amountPaise: 5000000,
          paidAt: "2026-09-16T12:00:00.000Z",
        }),
      ).toThrow();

      expect(() =>
        paymentRecordSchema.parse({
          utrNumber: "1234",
          amountPaise: 5000000,
          paidAt: "2026-09-16T12:00:00.000Z",
        }),
      ).toThrow();
    });

    it("rejects when UTR number exceeds 30 characters", () => {
      expect(() =>
        paymentRecordSchema.parse({
          utrNumber: "A".repeat(31),
          amountPaise: 5000000,
          paidAt: "2026-09-16T12:00:00.000Z",
        }),
      ).toThrow();
    });

    it("rejects non-positive payment amounts", () => {
      expect(() =>
        paymentRecordSchema.parse({
          utrNumber: "UTR123456",
          amountPaise: 0,
          paidAt: "2026-09-16T12:00:00.000Z",
        }),
      ).toThrow();

      expect(() =>
        paymentRecordSchema.parse({
          utrNumber: "UTR123456",
          amountPaise: -5000,
          paidAt: "2026-09-16T12:00:00.000Z",
        }),
      ).toThrow();
    });

    it("rejects non-integer paise", () => {
      expect(() =>
        paymentRecordSchema.parse({
          utrNumber: "UTR123456",
          amountPaise: 5000.5,
          paidAt: "2026-09-16T12:00:00.000Z",
        }),
      ).toThrow();
    });

    it("rejects invalid date strings", () => {
      expect(() =>
        paymentRecordSchema.parse({
          utrNumber: "UTR123456",
          amountPaise: 500000,
          paidAt: "not-a-valid-date",
        }),
      ).toThrow();
    });
  });

  describe("formatPaymentDto", () => {
    it("accurately transforms doc to PaymentDto with rupee derivations", () => {
      const dto = formatPaymentDto({
        _id: "66e2c914e9f73a11b8180001",
        loanId: "66e2c914e9f73a11b8180002",
        utrNumber: "UTR123456789",
        amountPaise: 5000000, // ₹50,000
        paidAt: new Date("2026-09-16T10:00:00Z"),
        recordedByUserId: "66e2c914e9f73a11b8180003",
        outstandingAfterPaise: 6200000, // ₹62,000
        createdAt: new Date("2026-09-16T10:05:00Z"),
      });

      expect(dto.id).toBe("66e2c914e9f73a11b8180001");
      expect(dto.loanId).toBe("66e2c914e9f73a11b8180002");
      expect(dto.utrNumber).toBe("UTR123456789");
      expect(dto.amountPaise).toBe(5000000);
      expect(dto.amountRupees).toBe(50000);
      expect(dto.outstandingAfterPaise).toBe(6200000);
      expect(dto.outstandingAfterRupees).toBe(62000);
      expect(dto.paidAt).toBe("2026-09-16T10:00:00.000Z");
      expect(dto.recordedByUserId).toBe("66e2c914e9f73a11b8180003");
    });
  });
});
