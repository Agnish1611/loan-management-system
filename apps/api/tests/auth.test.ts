import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import { apiV1Router } from "@/routes/index.js";
import { UserModel } from "@/models/index.js";
import { requireAuth, requireRole } from "@/middleware/index.js";
import { authService } from "@/services/index.js";

// Mount test endpoint on apiV1Router so it is handled before central errorHandler
apiV1Router.get(
  "/test-protected-sanction",
  requireAuth,
  requireRole("SANCTION"),
  (_req, res) => {
    res.status(200).json({ allowed: true });
  },
);

describe("Auth & RBAC Integration Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);
  });

  afterAll(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  describe("POST /api/v1/auth/register", () => {
    it("registers a borrower successfully with 201 Created", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        email: "borrower@example.com",
        password: "password123",
        fullName: "Jane Doe",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("borrower@example.com");
      expect(res.body.user.fullName).toBe("Jane Doe");
      expect(res.body.user.role).toBe("BORROWER");
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.token).toBeDefined();
    });

    it("rejects duplicate email with 409 Conflict", async () => {
      await request(app).post("/api/v1/auth/register").send({
        email: "duplicate@example.com",
        password: "password123",
        fullName: "User One",
      });

      const res = await request(app).post("/api/v1/auth/register").send({
        email: "duplicate@example.com",
        password: "password123",
        fullName: "User Two",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("Email is already registered");
    });

    it("rejects short passwords (< 8 chars) with 400 Bad Request", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        email: "short@example.com",
        password: "123",
        fullName: "Short Pass",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send({
        email: "login@example.com",
        password: "secretPassword123",
        fullName: "Login User",
      });
    });

    it("authenticates valid credentials with 200 OK and token", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@example.com",
        password: "secretPassword123",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("login@example.com");
    });

    it("rejects incorrect password with 401 Unauthorized", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@example.com",
        password: "wrongPassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });

    it("rejects non-existent email with 401 Unauthorized", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "unknown@example.com",
        password: "somePassword",
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Invalid email or password");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns current user profile with valid Bearer token", async () => {
      const reg = await request(app).post("/api/v1/auth/register").send({
        email: "me@example.com",
        password: "password123",
        fullName: "Self User",
      });

      const token = reg.body.token;

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("me@example.com");
      expect(res.body.user.fullName).toBe("Self User");
    });

    it("rejects request without Authorization header with 401", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("RBAC Guards (requireRole)", () => {
    it("allows ADMIN to access role-restricted endpoint", async () => {
      const admin = await UserModel.create({
        email: "admin@example.com",
        passwordHash: "hash",
        fullName: "Admin User",
        role: "ADMIN",
      });

      const token = authService.generateToken(admin);

      const res = await request(app)
        .get("/api/v1/test-protected-sanction")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(true);
    });

    it("allows SANCTION role to access SANCTION endpoint", async () => {
      const sanction = await UserModel.create({
        email: "sanction@example.com",
        passwordHash: "hash",
        fullName: "Sanction Officer",
        role: "SANCTION",
      });

      const token = authService.generateToken(sanction);

      const res = await request(app)
        .get("/api/v1/test-protected-sanction")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.allowed).toBe(true);
    });

    it("blocks BORROWER role with 403 Forbidden", async () => {
      const reg = await request(app).post("/api/v1/auth/register").send({
        email: "borrower-blocked@example.com",
        password: "password123",
        fullName: "Blocked Borrower",
      });

      const token = reg.body.token;

      const res = await request(app)
        .get("/api/v1/test-protected-sanction")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Access denied");
    });
  });
});
