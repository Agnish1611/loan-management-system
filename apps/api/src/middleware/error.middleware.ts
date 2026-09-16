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
    const issues = zodErr.issues || [];
    const firstMessage = issues[0]?.message;
    res.status(400).json({
      error: "Validation failed",
      message: firstMessage || "Validation failed",
      details: issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  if (
    err.name === "MulterError" ||
    (err as { code?: string }).code === "LIMIT_FILE_SIZE"
  ) {
    const multerCode = (err as { code?: string }).code;
    if (multerCode === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: "File size exceeds maximum limit of 5 MB",
        message: "File size exceeds maximum limit of 5 MB",
      });
      return;
    }
    res.status(400).json({
      error: `File upload error: ${err.message}`,
      message: `File upload error: ${err.message}`,
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
      message: appErr.message,
    });
    return;
  }

  // Mongo duplicate key error
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      error: "Duplicate field value entered",
      message: "Duplicate field value entered",
    });
    return;
  }

  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
}
