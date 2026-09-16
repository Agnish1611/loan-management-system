import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware — Route protection for the borrower portal.
 *
 * With httpOnly cookies, the server sets "lms_token" as a secure cookie.
 * We check for its presence here (not its validity — that's the API's job).
 * Any expired/invalid cookie will cause the first API call to return 401,
 * which the app handles by redirecting to /login.
 */

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const hasAuthCookie =
    request.cookies.has("lms_token") ||
    request.cookies.has("token") ||
    request.cookies.has("connect.sid");

  // Authenticated user hitting auth pages → send to dashboard
  if (isPublic && hasAuthCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user hitting protected pages → send to login
  if (!isPublic && !hasAuthCookie) {
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
