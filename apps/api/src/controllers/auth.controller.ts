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
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
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
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
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
    const clearOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
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
