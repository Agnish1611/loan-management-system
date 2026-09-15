import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "@/app.js";

describe("API Health Endpoints", () => {
  const app = createApp();

  it("GET /health returns status ok with timestamp", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("lms-api");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/health returns status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET / returns API welcome status", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Loan Management System API");
    expect(res.body.status).toBe("running");
  });
});
