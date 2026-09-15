import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "@/errors/index.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError || err.name === "ZodError") {
    const zodErr = err as ZodError;
    res.status(400).json({
      error: "Validation failed",
      details:
        zodErr.issues?.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })) || [],
    });
    return;
  }

  if (
    err instanceof AppError ||
    typeof (err as AppError).statusCode === "number"
  ) {
    const appErr = err as AppError;
    res.status(appErr.statusCode || 500).json({
      error: appErr.message,
    });
    return;
  }

  // Mongo duplicate key error
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      error: "Duplicate field value entered",
    });
    return;
  }

  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
}
