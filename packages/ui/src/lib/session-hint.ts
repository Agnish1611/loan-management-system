/**
 * session-hint.ts — a lightweight, non-authoritative "am I logged in"
 * flag cookie, scoped to the frontend's own domain.
 *
 * The real session lives in the httpOnly `token`/`lms_token` cookie set
 * by the API. When the API is on a different domain than the frontend
 * (e.g. Render vs. Vercel), the browser never attaches that cookie to
 * requests made to the frontend's own domain — so Next.js middleware
 * running there can never see it, no matter how it's configured.
 *
 * This cookie carries no privilege and is never sent to the API. It
 * only tells middleware "the last thing this browser did was log in"
 * so it can do a fast, presence-only server-side redirect — exactly
 * the "check presence, not validity" role middleware always had. If
 * it's stale or forged, the client-side `authApi.me()` check that runs
 * on every protected layout still catches it and redirects to login,
 * same as it always did.
 */
const COOKIE_NAME = "has_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function setSessionHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearSessionHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
