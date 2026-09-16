/**
 * lib/api/borrower.ts — Borrower profile API methods.
 */
import { apiClient } from "@repo/ui";
import type {
  BorrowerProfileDto,
  BorrowerProfileUpsertInput,
} from "@repo/types";

export const borrowerApi = {
  getProfile: () =>
    apiClient.get<{ profile: BorrowerProfileDto }>("/borrower/profile"),

  upsertProfile: (payload: BorrowerProfileUpsertInput) =>
    apiClient.put<{ profile: BorrowerProfileDto }>(
      "/borrower/profile",
      payload,
    ),
};
