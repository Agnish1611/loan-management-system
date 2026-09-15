import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import { UserModel, BorrowerProfileModel } from "@/models/index.js";
import { authService } from "@/services/index.js";

describe("Borrower Profile & BRE Integration Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  let borrower1Token: string;
  let borrower1Id: string;
  let borrower2Token: string;
  let borrower2Id: string;

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
    await BorrowerProfileModel.deleteMany({});
    await UserModel.deleteMany({});

    // Create user 1
    const user1 = await UserModel.create({
      email: "borrower1@creditsea.com",
      passwordHash: "hash123",
      fullName: "Borrower One",
      role: "BORROWER",
    });
    borrower1Id = user1._id.toString();
    borrower1Token = authService.generateToken(user1);

    // Create user 2
    const user2 = await UserModel.create({
      email: "borrower2@creditsea.com",
      passwordHash: "hash123",
      fullName: "Borrower Two",
      role: "BORROWER",
    });
    borrower2Id = user2._id.toString();
    borrower2Token = authService.generateToken(user2);
  });

  describe("PUT /api/v1/borrower/profile", () => {
    it("successfully creates eligible profile and returns 200 OK when BRE passes", async () => {
      const payload = {
        panNumber: "ABCDE1234F",
        dateOfBirth: "1995-05-15",
        monthlySalary: 65000,
        employmentMode: "SALARIED",
      };

      const res = await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.panNumber).toBe("ABCDE1234F");
      expect(res.body.profile.monthlySalaryPaise).toBe(6500000);
      expect(res.body.profile.bre.passed).toBe(true);
      expect(res.body.results).toHaveLength(4);

      // Verify persisted in DB
      const dbProfile = await BorrowerProfileModel.findOne({
        userId: borrower1Id,
      });
      expect(dbProfile).toBeDefined();
      expect(dbProfile?.bre.passed).toBe(true);
      expect(dbProfile?.monthlySalaryPaise).toBe(6500000);
    });

    it("persists audit trail and returns 422 Unprocessable Entity when BRE fails", async () => {
      const payload = {
        panNumber: "ABCDE1234F",
        dateOfBirth: "2005-01-01", // Under 23
        monthlySalary: 15000, // Under 25,000
        employmentMode: "UNEMPLOYED",
      };

      const res = await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("BRE_REJECTED");
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.bre.passed).toBe(false);

      const failedRules = res.body.results.filter(
        (r: { passed: boolean }) => !r.passed,
      );
      expect(failedRules.length).toBeGreaterThanOrEqual(3);

      // Verify failure audit trail was still persisted
      const dbProfile = await BorrowerProfileModel.findOne({
        userId: borrower1Id,
      });
      expect(dbProfile).toBeDefined();
      expect(dbProfile?.bre.passed).toBe(false);
    });

    it("rejects duplicate PAN claimed by another user with 409 Conflict", async () => {
      // User 1 claims PAN
      await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send({
          panNumber: "ABCDE1234F",
          dateOfBirth: "1995-05-15",
          monthlySalary: 65000,
          employmentMode: "SALARIED",
        });

      // User 2 attempts to claim identical PAN
      const res = await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower2Token}`)
        .send({
          panNumber: "ABCDE1234F",
          dateOfBirth: "1992-03-20",
          monthlySalary: 45000,
          employmentMode: "SALARIED",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("PAN is already registered");
    });

    it("allows the same user to update their own profile with updated eligibility", async () => {
      // First submission fails
      await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send({
          panNumber: "ABCDE1234F",
          dateOfBirth: "1995-05-15",
          monthlySalary: 10000, // Fails salary rule
          employmentMode: "SALARIED",
        });

      // Second submission with updated salary passes
      const res = await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send({
          panNumber: "ABCDE1234F",
          dateOfBirth: "1995-05-15",
          monthlySalary: 55000,
          employmentMode: "SALARIED",
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.bre.passed).toBe(true);
      expect(res.body.profile.monthlySalaryPaise).toBe(5500000);

      // Verify only 1 profile document exists for this user
      const count = await BorrowerProfileModel.countDocuments({
        userId: borrower1Id,
      });
      expect(count).toBe(1);
    });

    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).put("/api/v1/borrower/profile").send({
        panNumber: "ABCDE1234F",
        dateOfBirth: "1995-05-15",
        monthlySalary: 55000,
        employmentMode: "SALARIED",
      });

      expect(res.status).toBe(401);
    });

    it("rejects invalid input schema (malformed PAN or negative salary) with 400 Bad Request", async () => {
      const res = await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send({
          panNumber: "NOT-A-PAN",
          dateOfBirth: "invalid-date",
          monthlySalary: -500,
          employmentMode: "INVALID_MODE",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("GET /api/v1/borrower/profile", () => {
    it("returns 404 Not Found when profile does not exist", async () => {
      const res = await request(app)
        .get("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("Borrower profile not found");
    });

    it("returns borrower profile with stored BRE verdict when profile exists", async () => {
      await request(app)
        .put("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`)
        .send({
          panNumber: "ABCDE1234F",
          dateOfBirth: "1995-05-15",
          monthlySalary: 80000,
          employmentMode: "SALARIED",
        });

      const res = await request(app)
        .get("/api/v1/borrower/profile")
        .set("Authorization", `Bearer ${borrower1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.panNumber).toBe("ABCDE1234F");
      expect(res.body.profile.bre.passed).toBe(true);
      expect(res.body.profile.bre.ageAtEvaluation).toBeGreaterThanOrEqual(23);
    });

    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/v1/borrower/profile");
      expect(res.status).toBe(401);
    });
  });
});
