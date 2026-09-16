/**
 * lib/api/auth.ts — Auth API methods for the borrower portal.
 * Uses httpOnly cookies set by the backend (credentials: "include").
 */
import { apiClient } from "@repo/ui";
import type { AuthResponse, SanitizedUser } from "@repo/types";

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>("/auth/register", payload),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>("/auth/login", payload),

  me: () => apiClient.get<{ user: SanitizedUser }>("/auth/me"),

  logout: () => apiClient.post<void>("/auth/logout"),
};
