import { apiClient, ApiError } from "@repo/ui";
import type {
  BorrowerProfileDto,
  BorrowerProfileUpsertInput,
} from "@repo/types";

export interface UpsertProfileResult {
  profile: BorrowerProfileDto;
  message?: string;
  isEligible: boolean;
}

export const borrowerApi = {
  getProfile: async (): Promise<{ profile: BorrowerProfileDto | null }> => {
    try {
      return await apiClient.get<{ profile: BorrowerProfileDto }>(
        "/borrower/profile",
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return { profile: null };
      }
      throw err;
    }
  },

  upsertProfile: async (
    payload: BorrowerProfileUpsertInput,
  ): Promise<UpsertProfileResult> => {
    try {
      const res = await apiClient.put<{
        message?: string;
        profile: BorrowerProfileDto;
      }>("/borrower/profile", payload);
      return {
        profile: res.profile,
        message: res.message,
        isEligible: res.profile.bre.passed,
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const data = err.data as
          { profile?: BorrowerProfileDto; message?: string } | undefined;
        if (data?.profile) {
          return {
            profile: data.profile,
            message: data.message || "BRE eligibility check failed",
            isEligible: false,
          };
        }
      }
      throw err;
    }
  },
};
