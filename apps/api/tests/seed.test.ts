import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import { apiV1Router } from "@/routes/index.js";
import { UserModel, BorrowerProfileModel, LoanModel } from "@/models/index.js";
import { requireAuth, requireRole } from "@/middleware/index.js";
import {
  seedService,
  CANONICAL_SEED_USERS,
  DEFAULT_SEED_PASSWORD,
} from "@/services/index.js";

// Mount mock role-guarded endpoints to test all operational module permissions
apiV1Router.get(
  "/test-ops-sales",
  requireAuth,
  requireRole("SALES"),
  (_req, res) => {
    res.status(200).json({ module: "sales" });
  },
);

apiV1Router.get(
  "/test-ops-sanction",
  requireAuth,
  requireRole("SANCTION"),
  (_req, res) => {
    res.status(200).json({ module: "sanction" });
  },
);

apiV1Router.get(
  "/test-ops-disbursement",
  requireAuth,
  requireRole("DISBURSEMENT"),
  (_req, res) => {
    res.status(200).json({ module: "disbursement" });
  },
);

apiV1Router.get(
  "/test-ops-collection",
  requireAuth,
  requireRole("COLLECTION"),
  (_req, res) => {
    res.status(200).json({ module: "collection" });
  },
);

describe("Phase 2: Database Seeding & RBAC Matrix Integration Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();
  const tokens: Record<string, string> = {};

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

  describe("Idempotent Database Seeding", () => {
    it("seeds all canonical role accounts successfully on first execution", async () => {
      const result = await seedService.seed();

      expect(result.seededCount).toBe(CANONICAL_SEED_USERS.length);
      expect(result.users).toHaveLength(CANONICAL_SEED_USERS.length);

      const dbCount = await UserModel.countDocuments();
      expect(dbCount).toBe(CANONICAL_SEED_USERS.length);
    });

    it("runs idempotently without creating duplicate accounts or throwing errors", async () => {
      const result = await seedService.seed();

      expect(result.seededCount).toBe(CANONICAL_SEED_USERS.length);
      const dbCount = await UserModel.countDocuments();
      expect(dbCount).toBe(CANONICAL_SEED_USERS.length);
    });

    it("persists all expected attributes for each seeded user", async () => {
      for (const def of CANONICAL_SEED_USERS) {
        const user = await UserModel.findOne({ email: def.email });
        expect(user).toBeDefined();
        expect(user?.role).toBe(def.role);
        expect(user?.fullName).toBe(def.fullName);
        expect(user?.isActive).toBe(true);
      }
    });

    it("seeds demo borrower profiles with pre-evaluated BRE verdicts", async () => {
      // 1. Borrower Rahul Sharma -> BRE passed
      const rahul = await UserModel.findOne({
        email: "borrower@creditsea.com",
      });
      const rahulProfile = await BorrowerProfileModel.findOne({
        userId: rahul?._id,
      });
      expect(rahulProfile).toBeDefined();
      expect(rahulProfile?.bre.passed).toBe(true);
      expect(rahulProfile?.panNumber).toBe("ABCDE1234F");

      // 2. Borrower Vikram Singh -> BRE failed
      const vikram = await UserModel.findOne({
        email: "borrower.brefail@creditsea.com",
      });
      const vikramProfile = await BorrowerProfileModel.findOne({
        userId: vikram?._id,
      });
      expect(vikramProfile).toBeDefined();
      expect(vikramProfile?.bre.passed).toBe(false);
      expect(vikramProfile?.panNumber).toBe("XYZAB5678C");

      // 3. Borrower Priya Patel -> Registered lead (no profile yet)
      const priya = await UserModel.findOne({
        email: "borrower.lead@creditsea.com",
      });
      const priyaProfile = await BorrowerProfileModel.findOne({
        userId: priya?._id,
      });
      expect(priyaProfile).toBeNull();

      // Total profiles in DB (Rahul, Ananya, Karan, Vikram)
      const profileCount = await BorrowerProfileModel.countDocuments();
      expect(profileCount).toBe(4);

      // Seeded demo loans
      const loanCount = await LoanModel.countDocuments();
      expect(loanCount).toBe(3);

      const appliedLoan = await LoanModel.findOne({
        loanReference: "LN-2026-APPLIED1",
      });
      expect(appliedLoan).toBeDefined();
      expect(appliedLoan?.status).toBe("APPLIED");
      expect(appliedLoan?.principalPaise).toBe(10000000); // ₹100,000 in paise

      const sanctionedLoan = await LoanModel.findOne({
        loanReference: "LN-2026-SANCTION1",
      });
      expect(sanctionedLoan).toBeDefined();
      expect(sanctionedLoan?.status).toBe("SANCTIONED");

      const disbursedLoan = await LoanModel.findOne({
        loanReference: "LN-2026-DISBURSE1",
      });
      expect(disbursedLoan).toBeDefined();
      expect(disbursedLoan?.status).toBe("DISBURSED");
    });
  });

  describe("Authentication for Seeded Accounts", () => {
    it("authenticates all seeded roles with default credentials", async () => {
      for (const def of CANONICAL_SEED_USERS) {
        const res = await request(app).post("/api/v1/auth/login").send({
          email: def.email,
          password: DEFAULT_SEED_PASSWORD,
        });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(def.email);
        expect(res.body.user.role).toBe(def.role);
        expect(res.body.user.fullName).toBe(def.fullName);

        tokens[def.email] = res.body.token;
      }
    });
  });

  describe("Cross-Role RBAC Authorization Matrix", () => {
    it("grants ADMIN unrestricted access across all operational modules", async () => {
      const adminToken = tokens["admin@creditsea.com"];

      const resSales = await request(app)
        .get("/api/v1/test-ops-sales")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resSales.status).toBe(200);

      const resSanction = await request(app)
        .get("/api/v1/test-ops-sanction")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resSanction.status).toBe(200);

      const resDisburse = await request(app)
        .get("/api/v1/test-ops-disbursement")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resDisburse.status).toBe(200);

      const resCollection = await request(app)
        .get("/api/v1/test-ops-collection")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resCollection.status).toBe(200);
    });

    it("allows SALES access to sales module and denies other operational modules", async () => {
      const salesToken = tokens["sales@creditsea.com"];

      const resSales = await request(app)
        .get("/api/v1/test-ops-sales")
        .set("Authorization", `Bearer ${salesToken}`);
      expect(resSales.status).toBe(200);

      const resSanction = await request(app)
        .get("/api/v1/test-ops-sanction")
        .set("Authorization", `Bearer ${salesToken}`);
      expect(resSanction.status).toBe(403);
    });

    it("allows SANCTION access to sanction module and denies other operational modules", async () => {
      const sanctionToken = tokens["sanction@creditsea.com"];

      const resSanction = await request(app)
        .get("/api/v1/test-ops-sanction")
        .set("Authorization", `Bearer ${sanctionToken}`);
      expect(resSanction.status).toBe(200);

      const resDisburse = await request(app)
        .get("/api/v1/test-ops-disbursement")
        .set("Authorization", `Bearer ${sanctionToken}`);
      expect(resDisburse.status).toBe(403);
    });

    it("allows DISBURSEMENT access to disbursement module and denies other operational modules", async () => {
      const disburseToken = tokens["disbursement@creditsea.com"];

      const resDisburse = await request(app)
        .get("/api/v1/test-ops-disbursement")
        .set("Authorization", `Bearer ${disburseToken}`);
      expect(resDisburse.status).toBe(200);

      const resCollection = await request(app)
        .get("/api/v1/test-ops-collection")
        .set("Authorization", `Bearer ${disburseToken}`);
      expect(resCollection.status).toBe(403);
    });

    it("allows COLLECTION access to collection module and denies other operational modules", async () => {
      const collectionToken = tokens["collection@creditsea.com"];

      const resCollection = await request(app)
        .get("/api/v1/test-ops-collection")
        .set("Authorization", `Bearer ${collectionToken}`);
      expect(resCollection.status).toBe(200);

      const resSales = await request(app)
        .get("/api/v1/test-ops-sales")
        .set("Authorization", `Bearer ${collectionToken}`);
      expect(resSales.status).toBe(403);
    });

    it("blocks BORROWER from accessing any operational module", async () => {
      const borrowerToken = tokens["borrower@creditsea.com"];

      const resSales = await request(app)
        .get("/api/v1/test-ops-sales")
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resSales.status).toBe(403);

      const resSanction = await request(app)
        .get("/api/v1/test-ops-sanction")
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resSanction.status).toBe(403);

      const resDisburse = await request(app)
        .get("/api/v1/test-ops-disbursement")
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resDisburse.status).toBe(403);

      const resCollection = await request(app)
        .get("/api/v1/test-ops-collection")
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resCollection.status).toBe(403);
    });
  });
});
