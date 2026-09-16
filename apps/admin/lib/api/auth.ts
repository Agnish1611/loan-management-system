/**
 * lib/api/auth.ts — Auth API for the admin ops portal.
 */
import { apiClient } from "@repo/ui";
import type { AuthResponse, SanitizedUser } from "@repo/types";

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    apiClient.post<AuthResponse>("/auth/login", payload),

  me: () => apiClient.get<{ user: SanitizedUser }>("/auth/me"),

  logout: () => apiClient.post<void>("/auth/logout"),
};
