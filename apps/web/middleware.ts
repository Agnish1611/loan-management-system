import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — Route protection for the borrower portal.
 *
 * Checks for `has_session`, a lightweight non-authoritative flag cookie
 * set on this app's own domain by the client right after a successful
 * login/register (see @repo/ui's setSessionHint). It is NOT the real
 * session — that's the httpOnly `token`/`lms_token` cookie the API sets
 * on its own domain, which this middleware can never see when the API
 * lives on a different domain than this app (e.g. Render vs. Vercel);
 * the browser simply never attaches a cookie across domains that way.
 *
 * This is presence-only, same as it always was: a fast server-side
 * redirect hint, not a validity check. Any expired/invalid/missing real
 * session still gets caught by the first API call each protected layout
 * makes (authApi.me()), which redirects to /login on a 401 regardless
 * of what this middleware decided.
 */
const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const hasSessionHint = request.cookies.has("has_session");

  // Authenticated user hitting auth pages → send to dashboard
  if (isPublic && hasSessionHint) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user hitting protected pages → send to login
  if (!isPublic && !hasSessionHint) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
