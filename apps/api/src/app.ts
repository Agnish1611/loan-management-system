import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import type { HealthCheckResponse } from "@repo/types";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check endpoints
  const healthHandler = (_req: Request, res: Response<HealthCheckResponse>) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "lms-api",
    });
  };

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      name: "Loan Management System API",
      version: "1.0.0",
      status: "running",
    });
  });

  return app;
}

export const app = createApp();
