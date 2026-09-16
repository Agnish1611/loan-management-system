import { z } from "zod";
import { fromPaise } from "./money.js";
import type { OpsLoanDto } from "./workflow.js";

export const paymentRecordSchema = z.object({
  utrNumber: z
    .string()
    .trim()
    .min(6, "UTR number must be at least 6 characters")
    .max(30, "UTR number cannot exceed 30 characters")
    .toUpperCase(),
  amountPaise: z
    .number()
    .int("Amount must be an integer number of paise")
    .positive("Payment amount must be greater than zero"),
  paidAt: z
    .string()
    .refine(
      (val) => !isNaN(Date.parse(val)),
      "Invalid payment date format. Must be an ISO timestamp",
    ),
});

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;

export interface PaymentDto {
  id: string;
  loanId: string;
  utrNumber: string;
  amountPaise: number;
  amountRupees: number;
  paidAt: string;
  recordedByUserId: string;
  outstandingAfterPaise: number;
  outstandingAfterRupees: number;
  createdAt: string;
}

export interface PaymentRecordResponse {
  message: string;
  payment: PaymentDto;
  loan: OpsLoanDto;
}

export function formatPaymentDto(paymentDoc: {
  _id: { toString(): string };
  loanId: { toString(): string };
  utrNumber: string;
  amountPaise: number;
  paidAt: Date;
  recordedByUserId: { toString(): string };
  outstandingAfterPaise: number;
  createdAt: Date;
}): PaymentDto {
  return {
    id: paymentDoc._id.toString(),
    loanId: paymentDoc.loanId.toString(),
    utrNumber: paymentDoc.utrNumber,
    amountPaise: paymentDoc.amountPaise,
    amountRupees: fromPaise(paymentDoc.amountPaise),
    paidAt: paymentDoc.paidAt.toISOString(),
    recordedByUserId: paymentDoc.recordedByUserId.toString(),
    outstandingAfterPaise: paymentDoc.outstandingAfterPaise,
    outstandingAfterRupees: fromPaise(paymentDoc.outstandingAfterPaise),
    createdAt: paymentDoc.createdAt.toISOString(),
  };
}
