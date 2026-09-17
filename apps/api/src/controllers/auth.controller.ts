import type { Request, Response, NextFunction, CookieOptions } from "express";
import { authService, type AuthService } from "@/services/index.js";

const COOKIE_NAMES = ["token", "lms_token"] as const;

/**
 * A cookie's attributes (SameSite, Secure, Partitioned) are part of its
 * storage identity, not just metadata — a cookie set with SameSite=None;
 * Partitioned does NOT overwrite one previously set with SameSite=Lax and
 * no Partitioned flag, even with the same name/path. They coexist as
 * separate entries, and which one the browser sends first (and which one
 * our server's cookie parser reads) isn't something we control. In
 * practice this showed up as: log in as one user, then log in as another
 * without clearing cookies, and the server kept authenticating the first
 * user — a stale cookie from an older attribute combination never got
 * displaced by the new login.
 *
 * This cookie has shipped with three different attribute shapes across
 * this project's history (SameSite hardcoded to "lax" regardless of
 * environment; then SameSite=None/Secure without Partitioned; now with
 * Partitioned too), so anyone who tested against a live deployment across
 * that history can have all three stacked up in their browser right now.
 * Explicitly clearing every shape this cookie has ever been set with,
 * before setting a fresh one, guarantees none of them can survive a new
 * login — clearCookie only removes a cookie whose attributes match what's
 * passed in, so partial coverage silently misses whichever shape doesn't
 * match.
 */
const HISTORICAL_COOKIE_SHAPES: Array<
  Pick<CookieOptions, "secure" | "sameSite" | "partitioned">
> = [
  { secure: false, sameSite: "lax", partitioned: false }, // local dev
  { secure: true, sameSite: "lax", partitioned: false }, // original bug: hardcoded "lax"
  { secure: true, sameSite: "none", partitioned: false }, // SameSite fix, pre-Partitioned
  { secure: true, sameSite: "none", partitioned: true }, // current
];

function clearAllCookieVariants(res: Response) {
  for (const name of COOKIE_NAMES) {
    for (const shape of HISTORICAL_COOKIE_SHAPES) {
      res.clearCookie(name, { httpOnly: true, path: "/", ...shape });
    }
  }
}

function authCookieOptions(): CookieOptions & { maxAge: number } {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    // Cross-site in production (frontend and API are on different
    // domains — e.g. Vercel and Render), so the cookie needs
    // SameSite=None to be sent at all; None requires Secure, which
    // is exactly when isProd is true. Same-site locally, where Lax
    // works fine over plain http://localhost.
    sameSite: isProd ? "none" : "lax",
    // Required by CHIPS alongside SameSite=None/Secure, or browsers
    // will start rejecting the cookie in this cross-site setup.
    partitioned: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      clearAllCookieVariants(res);
      const cookieOptions = authCookieOptions();
      res.cookie("token", result.token, cookieOptions);
      res.cookie("lms_token", result.token, cookieOptions);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      clearAllCookieVariants(res);
      const cookieOptions = authCookieOptions();
      res.cookie("token", result.token, cookieOptions);
      res.cookie("lms_token", result.token, cookieOptions);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    clearAllCookieVariants(res);
    res.status(200).json({ message: "Logged out successfully" });
  };

  me = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await this.service.getCurrentUser(req.user!.id);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
