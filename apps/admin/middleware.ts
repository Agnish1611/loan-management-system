import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — Route protection for the ops dashboard.
 *
 * Checks `has_session`, a non-authoritative presence flag set on this
 * app's own domain by the client after login (see @repo/ui's
 * setSessionHint). The real session is the httpOnly cookie the API
 * sets on its own domain — invisible to this middleware whenever the
 * API and this app are on different domains (e.g. Render vs. Vercel),
 * since browsers never attach a cookie across domains that way.
 *
 * Presence-only, as before: a fast redirect hint, not a validity
 * check. Each protected layout's authApi.me() call is still the real
 * gate and redirects to /login on a 401 regardless of this decision.
 */
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const hasSessionHint = request.cookies.has("has_session");

  if (isPublic && hasSessionHint) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isPublic && !hasSessionHint) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
