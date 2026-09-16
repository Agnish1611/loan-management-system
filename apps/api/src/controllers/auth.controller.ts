import type { Request, Response, NextFunction } from "express";
import { authService, type AuthService } from "@/services/index.js";

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      const isProd = process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        // Cross-site in production (frontend and API are on different
        // domains — e.g. Vercel and Render), so the cookie needs
        // SameSite=None to be sent at all; None requires Secure, which
        // is exactly when isProd is true. Same-site locally, where Lax
        // works fine over plain http://localhost.
        sameSite: isProd ? ("none" as const) : ("lax" as const),
        // Required by CHIPS alongside SameSite=None/Secure, or browsers
        // will start rejecting the cookie in this cross-site setup.
        partitioned: isProd,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };
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
      const isProd = process.env.NODE_ENV === "production";
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? ("none" as const) : ("lax" as const),
        partitioned: isProd,
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };
      res.cookie("token", result.token, cookieOptions);
      res.cookie("lms_token", result.token, cookieOptions);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    const isProd = process.env.NODE_ENV === "production";
    const clearOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? ("none" as const) : ("lax" as const),
      partitioned: isProd,
      path: "/",
    };
    res.clearCookie("token", clearOptions);
    res.clearCookie("lms_token", clearOptions);
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
