import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import {
  UserModel,
  BorrowerProfileModel,
  LoanModel,
  DocumentModel,
} from "@/models/index.js";
import { authService } from "@/services/index.js";
import { calculateLoanTermsFromRupees, toPaise } from "@repo/types";

describe("Phase 8: Sales Leads Dynamic Aggregation & Filtering Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  // Internal users & tokens
  let salesUser: any;
  let salesToken: string;

  let adminUser: any;
  let adminToken: string;

  let sanctionUser: any;
  let sanctionToken: string;

  let disbursementUser: any;
  let disbursementToken: string;

  let collectionUser: any;
  let collectionToken: string;

  let borrowerUser: any;
  let borrowerToken: string;

  // Borrower leads
  let registeredOnlyUser: any;
  let profileDoneUser: any;
  let breRejectedUser: any;
  let borrowerWithLoanUser: any;

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
    await LoanModel.deleteMany({});
    await DocumentModel.deleteMany({});
    await BorrowerProfileModel.deleteMany({});
    await UserModel.deleteMany({});

    // 1. Create staff users
    salesUser = await UserModel.create({
      email: "sales@creditsea.com",
      passwordHash: "hash123",
      fullName: "Ananya Sales",
      role: "SALES",
    });
    salesToken = authService.generateToken(salesUser);

    adminUser = await UserModel.create({
      email: "admin@creditsea.com",
      passwordHash: "hash123",
      fullName: "System Admin",
      role: "ADMIN",
    });
    adminToken = authService.generateToken(adminUser);

    sanctionUser = await UserModel.create({
      email: "sanction@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sanction Officer",
      role: "SANCTION",
    });
    sanctionToken = authService.generateToken(sanctionUser);

    disbursementUser = await UserModel.create({
      email: "disburse@creditsea.com",
      passwordHash: "hash123",
      fullName: "Disbursement Manager",
      role: "DISBURSEMENT",
    });
    disbursementToken = authService.generateToken(disbursementUser);

    collectionUser = await UserModel.create({
      email: "collect@creditsea.com",
      passwordHash: "hash123",
      fullName: "Collection Officer",
      role: "COLLECTION",
    });
    collectionToken = authService.generateToken(collectionUser);

    borrowerUser = await UserModel.create({
      email: "borrower.generic@creditsea.com",
      passwordHash: "hash123",
      fullName: "Generic Borrower",
      role: "BORROWER",
    });
    borrowerToken = authService.generateToken(borrowerUser);

    // 2. Lead 1: REGISTERED_ONLY (Registered, no profile, no loans)
    registeredOnlyUser = await UserModel.create({
      email: "priya.lead@example.com",
      passwordHash: "hash123",
      fullName: "Priya Patel",
      role: "BORROWER",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
    });

    // 3. Lead 2: PROFILE_DONE (Registered, BRE passed, no loans)
    profileDoneUser = await UserModel.create({
      email: "arjun.passed@example.com",
      passwordHash: "hash123",
      fullName: "Arjun Verma",
      role: "BORROWER",
      createdAt: new Date("2026-01-02T10:00:00.000Z"),
    });

    await BorrowerProfileModel.create({
      userId: profileDoneUser._id,
      panNumber: "ABCDE1234F",
      dateOfBirth: new Date("1995-05-15"),
      monthlySalaryPaise: toPaise(85000),
      employmentMode: "SALARIED",
      bre: {
        passed: true,
        evaluatedAt: new Date("2026-01-02T10:05:00.000Z"),
        ageAtEvaluation: 30,
        results: [
          { rule: "PAN", passed: true, message: "Valid PAN format" },
          { rule: "AGE", passed: true, message: "Age 30 is within 23-50" },
          {
            rule: "SALARY",
            passed: true,
            message: "Monthly salary ₹85,000 >= ₹25,000",
          },
          {
            rule: "EMPLOYMENT",
            passed: true,
            message: "Employment mode SALARIED is eligible",
          },
        ],
      },
    });

    // 4. Lead 3: BRE_REJECTED (Registered, BRE failed, no loans)
    breRejectedUser = await UserModel.create({
      email: "vikram.rejected@example.com",
      passwordHash: "hash123",
      fullName: "Vikram Singh",
      role: "BORROWER",
      createdAt: new Date("2026-01-03T10:00:00.000Z"),
    });

    await BorrowerProfileModel.create({
      userId: breRejectedUser._id,
      panNumber: "XYZPK9876Q",
      dateOfBirth: new Date("2005-01-01"),
      monthlySalaryPaise: toPaise(15000),
      employmentMode: "UNEMPLOYED",
      bre: {
        passed: false,
        evaluatedAt: new Date("2026-01-03T10:05:00.000Z"),
        ageAtEvaluation: 21,
        results: [
          { rule: "PAN", passed: true, message: "Valid PAN format" },
          {
            rule: "AGE",
            passed: false,
            message: "Age 21 is below minimum requirement of 23",
          },
          {
            rule: "SALARY",
            passed: false,
            message: "Monthly salary ₹15,000 is below minimum ₹25,000",
          },
          {
            rule: "EMPLOYMENT",
            passed: false,
            message: "Employment mode UNEMPLOYED is not eligible",
          },
        ],
      },
    });

    // 5. Borrower with an applied loan (MUST be excluded from leads feed)
    borrowerWithLoanUser = await UserModel.create({
      email: "neha.withloan@example.com",
      passwordHash: "hash123",
      fullName: "Neha Sharma",
      role: "BORROWER",
      createdAt: new Date("2026-01-04T10:00:00.000Z"),
    });

    await BorrowerProfileModel.create({
      userId: borrowerWithLoanUser._id,
      panNumber: "NEHAX1111N",
      dateOfBirth: new Date("1992-03-20"),
      monthlySalaryPaise: toPaise(95000),
      employmentMode: "SALARIED",
      bre: {
        passed: true,
        evaluatedAt: new Date("2026-01-04T10:05:00.000Z"),
        ageAtEvaluation: 33,
        results: [],
      },
    });

    const salaryDoc = await DocumentModel.create({
      ownerUserId: borrowerWithLoanUser._id,
      docType: "SALARY_SLIP",
      provider: "LOCAL",
      storageKey: `salary-slips/${borrowerWithLoanUser._id}/slip.pdf`,
      bucket: null,
      originalFilename: "salary.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });

    const terms = calculateLoanTermsFromRupees(100000, 180);
    await LoanModel.create({
      loanReference: "LN-2026-TESTNEHA01",
      borrowerUserId: borrowerWithLoanUser._id,
      salarySlipDocumentId: salaryDoc._id,
      principalPaise: terms.principalPaise,
      tenureDays: terms.tenureDays,
      annualInterestRateBps: terms.annualInterestRateBps,
      interestPaise: terms.interestPaise,
      totalRepaymentPaise: terms.totalRepaymentPaise,
      amountPaidPaise: 0,
      outstandingPaise: terms.totalRepaymentPaise,
      status: "APPLIED",
      statusHistory: [
        {
          from: null,
          to: "APPLIED",
          byUserId: borrowerWithLoanUser._id,
          reason: null,
          at: new Date(),
        },
      ],
      applicantSnapshot: {
        monthlySalaryPaise: toPaise(95000),
        employmentMode: "SALARIED",
        ageAtApplication: 33,
      },
    });
  });

  describe("Lead Classification & Aggregation Feed", () => {
    it("should retrieve all non-loan borrowers aggregated with their correct lead stages", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("leads");
      expect(res.body).toHaveProperty("count");
      expect(Array.isArray(res.body.leads)).toBe(true);

      // We have generic borrower (no profile, no loan), Priya (registered_only), Arjun (profile_done), Vikram (bre_rejected)
      // Neha (with loan) MUST NOT be present
      const leadEmails = res.body.leads.map((l: any) => l.email);
      expect(leadEmails).toContain("priya.lead@example.com");
      expect(leadEmails).toContain("arjun.passed@example.com");
      expect(leadEmails).toContain("vikram.rejected@example.com");
      expect(leadEmails).not.toContain("neha.withloan@example.com");

      // Staff users must not be present
      expect(leadEmails).not.toContain("sales@creditsea.com");
      expect(leadEmails).not.toContain("admin@creditsea.com");
      expect(leadEmails).not.toContain("sanction@creditsea.com");
    });

    it("should correctly classify REGISTERED_ONLY stage with null profile and bre", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=REGISTERED_ONLY")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const priya = res.body.leads.find(
        (l: any) => l.email === "priya.lead@example.com",
      );
      expect(priya).toBeDefined();
      expect(priya.stage).toBe("REGISTERED_ONLY");
      expect(priya.fullName).toBe("Priya Patel");
      expect(priya.profile).toBeUndefined();
      expect(priya.bre).toBeUndefined();
      expect(priya.passwordHash).toBeUndefined();
    });

    it("should correctly classify PROFILE_DONE stage with profile details and passed BRE", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=PROFILE_DONE")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const arjun = res.body.leads.find(
        (l: any) => l.email === "arjun.passed@example.com",
      );
      expect(arjun).toBeDefined();
      expect(arjun.stage).toBe("PROFILE_DONE");
      expect(arjun.fullName).toBe("Arjun Verma");
      expect(arjun.profile).toBeDefined();
      expect(arjun.profile.panNumber).toBe("ABCDE1234F");
      expect(arjun.profile.monthlySalaryPaise).toBe(toPaise(85000));
      expect(arjun.profile.monthlySalaryRupees).toBe(85000);
      expect(arjun.profile.employmentMode).toBe("SALARIED");
      expect(arjun.bre).toBeDefined();
      expect(arjun.bre.passed).toBe(true);
      expect(arjun.bre.ageAtEvaluation).toBe(30);
      expect(arjun.bre.results).toHaveLength(4);
    });

    it("should correctly classify BRE_REJECTED stage with profile details and failed BRE rules", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=BRE_REJECTED")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const vikram = res.body.leads.find(
        (l: any) => l.email === "vikram.rejected@example.com",
      );
      expect(vikram).toBeDefined();
      expect(vikram.stage).toBe("BRE_REJECTED");
      expect(vikram.fullName).toBe("Vikram Singh");
      expect(vikram.profile).toBeDefined();
      expect(vikram.profile.panNumber).toBe("XYZPK9876Q");
      expect(vikram.profile.monthlySalaryPaise).toBe(toPaise(15000));
      expect(vikram.profile.monthlySalaryRupees).toBe(15000);
      expect(vikram.bre).toBeDefined();
      expect(vikram.bre.passed).toBe(false);
      expect(vikram.bre.ageAtEvaluation).toBe(21);
      expect(
        vikram.bre.results.some((r: any) => r.rule === "AGE" && !r.passed),
      ).toBe(true);
    });

    it("should never include borrowers who have applied for loans", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=ALL")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const found = res.body.leads.find(
        (l: any) => l.email === "neha.withloan@example.com",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("Stage Filtering", () => {
    it("should filter by stage=ALL returning all stages", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=ALL")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      const stages = new Set(res.body.leads.map((l: any) => l.stage));
      expect(stages.has("REGISTERED_ONLY")).toBe(true);
      expect(stages.has("PROFILE_DONE")).toBe(true);
      expect(stages.has("BRE_REJECTED")).toBe(true);
    });

    it("should return only REGISTERED_ONLY leads when stage=REGISTERED_ONLY", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=REGISTERED_ONLY")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBeGreaterThan(0);
      for (const lead of res.body.leads) {
        expect(lead.stage).toBe("REGISTERED_ONLY");
      }
    });

    it("should return only PROFILE_DONE leads when stage=PROFILE_DONE", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=PROFILE_DONE")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBe(1);
      expect(res.body.leads[0].email).toBe("arjun.passed@example.com");
      expect(res.body.leads[0].stage).toBe("PROFILE_DONE");
    });

    it("should return only BRE_REJECTED leads when stage=BRE_REJECTED", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=BRE_REJECTED")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBe(1);
      expect(res.body.leads[0].email).toBe("vikram.rejected@example.com");
      expect(res.body.leads[0].stage).toBe("BRE_REJECTED");
    });

    it("should return 400 Bad Request for an invalid stage", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?stage=NON_EXISTENT_STAGE")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe("Search Filtering", () => {
    it("should search case-insensitively by fullName", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?search=priya")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBe(1);
      expect(res.body.leads[0].fullName).toBe("Priya Patel");
    });

    it("should search case-insensitively by email", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?search=arjun.passed")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBe(1);
      expect(res.body.leads[0].fullName).toBe("Arjun Verma");
    });

    it("should search case-insensitively by PAN number", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?search=xyzpk9876q")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads.length).toBe(1);
      expect(res.body.leads[0].fullName).toBe("Vikram Singh");
    });

    it("should return empty leads when search query has no matches", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads?search=NonExistentPersonName123")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it("should combine stage filter and search query correctly", async () => {
      // Search for 'Verma' under REGISTERED_ONLY should yield 0 results
      const res1 = await request(app)
        .get("/api/v1/ops/sales/leads?stage=REGISTERED_ONLY&search=Verma")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.leads).toHaveLength(0);

      // Search for 'Verma' under PROFILE_DONE should find Arjun
      const res2 = await request(app)
        .get("/api/v1/ops/sales/leads?stage=PROFILE_DONE&search=Verma")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.leads).toHaveLength(1);
      expect(res2.body.leads[0].fullName).toBe("Arjun Verma");
    });
  });

  describe("RBAC Matrix & Auth Guards", () => {
    it("should allow SALES role (200 OK)", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${salesToken}`);

      expect(res.status).toBe(200);
    });

    it("should allow ADMIN role (200 OK)", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should block SANCTION role (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${sanctionToken}`);

      expect(res.status).toBe(403);
    });

    it("should block DISBURSEMENT role (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${disbursementToken}`);

      expect(res.status).toBe(403);
    });

    it("should block COLLECTION role (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${collectionToken}`);

      expect(res.status).toBe(403);
    });

    it("should block BORROWER role (403 Forbidden)", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sales/leads")
        .set("Authorization", `Bearer ${borrowerToken}`);

      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated request (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/v1/ops/sales/leads");

      expect(res.status).toBe(401);
    });
  });
});
