/**
 * lib/api/ops.ts — Ops API client for the admin dashboard.
 * Covers Sales, Sanction, Disbursement, and Collection modules.
 */
import { apiClient, buildQuery } from "@repo/ui";
import type {
  OpsLoanDto,
  SalesLeadDto,
  SalesLeadQueryInput,
  PaymentDto,
  PaymentRecordInput,
  PaymentRecordResponse,
} from "@repo/types";

// ── Sales module
export const salesApi = {
  getLeads: (query: Partial<SalesLeadQueryInput> = {}) =>
    apiClient.get<{ leads: SalesLeadDto[] }>(
      `/ops/sales/leads${buildQuery(query as Record<string, string>)}`,
    ),

  getLeadById: (leadId: string) =>
    apiClient.get<{ lead: SalesLeadDto }>(`/ops/sales/leads/${leadId}`),
};

// ── Sanction module
export const sanctionApi = {
  getLoans: () => apiClient.get<{ loans: OpsLoanDto[] }>("/ops/sanction/loans"),

  sanction: (loanId: string, notes?: string) =>
    apiClient.post<{ loan: OpsLoanDto }>(`/ops/loans/${loanId}/sanction`, {
      notes,
    }),

  reject: (loanId: string, reason: string) =>
    apiClient.post<{ loan: OpsLoanDto }>(`/ops/loans/${loanId}/reject`, {
      reason,
    }),
};

// ── Disbursement module
export const disbursementApi = {
  getLoans: () =>
    apiClient.get<{ loans: OpsLoanDto[] }>("/ops/disbursement/loans"),

  disburse: (loanId: string, notes?: string) =>
    apiClient.post<{ loan: OpsLoanDto }>(`/ops/loans/${loanId}/disburse`, {
      notes,
    }),
};

// ── Collection module
export const collectionApi = {
  getLoans: () =>
    apiClient.get<{ loans: OpsLoanDto[] }>("/ops/collection/loans"),

  recordPayment: (loanId: string, payload: PaymentRecordInput) =>
    apiClient.post<PaymentRecordResponse>(
      `/ops/loans/${loanId}/payments`,
      payload,
    ),

  getPayments: (loanId: string) =>
    apiClient.get<{ payments: PaymentDto[] }>(`/ops/loans/${loanId}/payments`),
};

// ── Global Operations Ledger & Analytics
export interface RecentActivityItem {
  loanId: string;
  loanReference: string;
  borrowerName: string;
  from: string | null;
  to: string;
  byUserId: string | null;
  byUserName?: string | null;
  byUserRole?: string | null;
  reason: string | null;
  at: string;
}

export interface PortfolioStats {
  totalDisbursedPaise: number;
  totalCollectedPaise: number;
  outstandingPaise: number;
}

export const opsApi = {
  getAllLoans: (query: { status?: string; search?: string } = {}) =>
    apiClient.get<{ loans: OpsLoanDto[]; count: number }>(
      `/ops/loans${buildQuery(query as Record<string, string>)}`,
    ),

  getLoanById: (loanId: string) =>
    apiClient.get<{ loan: OpsLoanDto }>(`/ops/loans/${loanId}`),

  getActivity: (limit = 10) =>
    apiClient.get<{ activity: RecentActivityItem[] }>(
      `/ops/activity?limit=${limit}`,
    ),

  getStats: () => apiClient.get<PortfolioStats>("/ops/stats"),
};
