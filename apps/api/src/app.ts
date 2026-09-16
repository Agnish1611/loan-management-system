import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { apiV1Router } from "@/routes/index.js";
import { errorHandler } from "@/middleware/index.js";
import type { HealthCheckResponse } from "@repo/types";

export function createApp(): Express {
  const app = express();

  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  // Health check
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

  // Versioned API routes
  app.use("/api/v1", apiV1Router);

  // Central error handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
