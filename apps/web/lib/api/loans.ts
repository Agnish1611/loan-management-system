/**
 * lib/api/loans.ts — Loan API methods for borrowers.
 */
import { apiClient, buildQuery } from "@repo/ui";
import type { LoanDto, LoanApplyInput } from "@repo/types";
import type { PaymentDto } from "@repo/types";

export interface LoanQuoteResult {
  principalPaise: number;
  tenureDays: number;
  annualInterestRateBps: number;
  interestPaise: number;
  totalRepaymentPaise: number;
}

export const loansApi = {
  quote: (principalRupees: number, tenureDays: number) =>
    apiClient.get<LoanQuoteResult>(
      `/loans/quote${buildQuery({ principalRupees, tenureDays })}`,
    ),

  apply: (payload: LoanApplyInput) =>
    apiClient.post<{ loan: LoanDto }>("/loans", payload),

  listMine: () => apiClient.get<{ loans: LoanDto[] }>("/loans/mine"),

  getById: (id: string) => apiClient.get<{ loan: LoanDto }>(`/loans/${id}`),

  getPayments: (id: string) =>
    apiClient.get<{ payments: PaymentDto[] }>(`/loans/${id}/payments`),
};
