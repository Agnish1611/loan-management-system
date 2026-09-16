import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/index.js";
import { UnauthorizedError, ForbiddenError } from "@/errors/index.js";
import { userRepository } from "@/repositories/index.js";
import { authService } from "@/services/index.js";
import type { Role, SanitizedUser } from "@repo/types";

declare global {
  namespace Express {
    interface Request {
      user?: SanitizedUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  role: Role;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(
      /(?:^|;\s*)(?:token|lms_token)=([^;]*)/,
    );
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
  } else if (req.query?.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return next(new UnauthorizedError("Authentication token is required"));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await userRepository.findById(decoded.sub);

    if (!user || !user.isActive) {
      return next(
        new UnauthorizedError("User does not exist or has been deactivated"),
      );
    }

    req.user = authService.sanitize(user);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired authentication token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication is required"));
    }

    if (req.user.role === "ADMIN" || roles.includes(req.user.role)) {
      return next();
    }

    next(
      new ForbiddenError(`Access denied: required role ${roles.join(" or ")}`),
    );
  };
}
