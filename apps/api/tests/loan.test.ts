import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import {
  UserModel,
  BorrowerProfileModel,
  DocumentModel,
  LoanModel,
} from "@/models/index.js";
import { authService } from "@/services/index.js";
import { evaluateBre, toPaise } from "@repo/types";

describe("Phase 5: Loan Math & Application Lifecycle Integration Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  // Test users & tokens
  let eligibleBorrowerUser: any;
  let eligibleBorrowerToken: string;

  let failedBreBorrowerUser: any;
  let failedBreBorrowerToken: string;

  let noProfileBorrowerUser: any;
  let noProfileBorrowerToken: string;

  let otherBorrowerUser: any;
  let otherBorrowerToken: string;

  let sanctionOfficerUser: any;
  let sanctionOfficerToken: string;

  let adminUser: any;
  let adminToken: string;

  // Documents
  let validSalarySlipDocId: string;
  let otherUserSalarySlipDocId: string;

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

    // 1. Create Eligible Borrower (Rahul)
    eligibleBorrowerUser = await UserModel.create({
      email: "eligible.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Rahul Sharma",
      role: "BORROWER",
    });
    eligibleBorrowerToken = authService.generateToken(eligibleBorrowerUser);

    const rahulDob = new Date("1995-05-15");
    const rahulBre = evaluateBre({
      panNumber: "ABCDE1234F",
      dateOfBirth: rahulDob,
      monthlySalary: 75000,
      employmentMode: "SALARIED",
    });
    await BorrowerProfileModel.create({
      userId: eligibleBorrowerUser._id,
      panNumber: "ABCDE1234F",
      dateOfBirth: rahulDob,
      monthlySalaryPaise: toPaise(75000),
      employmentMode: "SALARIED",
      bre: rahulBre,
    });

    // Valid Salary Slip Document for Rahul
    const doc1 = await DocumentModel.create({
      ownerUserId: eligibleBorrowerUser._id,
      docType: "SALARY_SLIP",
      provider: "LOCAL",
      storageKey: `salary-slips/${eligibleBorrowerUser._id}/slip.pdf`,
      bucket: null,
      originalFilename: "rahul-salary-slip.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024 * 50,
    });
    validSalarySlipDocId = doc1._id.toString();

    // 2. Create BRE Failed Borrower (Vikram)
    failedBreBorrowerUser = await UserModel.create({
      email: "failed.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Vikram Singh",
      role: "BORROWER",
    });
    failedBreBorrowerToken = authService.generateToken(failedBreBorrowerUser);

    const vikramDob = new Date("2005-01-01");
    const vikramBre = evaluateBre({
      panNumber: "XYZAB5678C",
      dateOfBirth: vikramDob,
      monthlySalary: 15000,
      employmentMode: "UNEMPLOYED",
    });
    await BorrowerProfileModel.create({
      userId: failedBreBorrowerUser._id,
      panNumber: "XYZAB5678C",
      dateOfBirth: vikramDob,
      monthlySalaryPaise: toPaise(15000),
      employmentMode: "UNEMPLOYED",
      bre: vikramBre,
    });

    // 3. Create No-Profile Borrower (Priya)
    noProfileBorrowerUser = await UserModel.create({
      email: "noprofile.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Priya Patel",
      role: "BORROWER",
    });
    noProfileBorrowerToken = authService.generateToken(noProfileBorrowerUser);

    // 4. Create Other Borrower (Ananya)
    otherBorrowerUser = await UserModel.create({
      email: "other.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Ananya Verma",
      role: "BORROWER",
    });
    otherBorrowerToken = authService.generateToken(otherBorrowerUser);

    const otherDoc = await DocumentModel.create({
      ownerUserId: otherBorrowerUser._id,
      docType: "SALARY_SLIP",
      provider: "LOCAL",
      storageKey: `salary-slips/${otherBorrowerUser._id}/slip.pdf`,
      bucket: null,
      originalFilename: "ananya-slip.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024 * 40,
    });
    otherUserSalarySlipDocId = otherDoc._id.toString();

    // 5. Sanction Officer
    sanctionOfficerUser = await UserModel.create({
      email: "officer@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sanction Officer",
      role: "SANCTION",
    });
    sanctionOfficerToken = authService.generateToken(sanctionOfficerUser);

    // 6. Admin
    adminUser = await UserModel.create({
      email: "admin@creditsea.com",
      passwordHash: "hash123",
      fullName: "System Admin",
      role: "ADMIN",
    });
    adminToken = authService.generateToken(adminUser);
  });

  describe("GET /api/v1/loans/quote", () => {
    it("returns accurate loan calculation for valid parameters (spot check: ₹100k, 365 days)", async () => {
      const res = await request(app)
        .get("/api/v1/loans/quote")
        .query({ principalRupees: 100000, tenureDays: 365 });

      expect(res.status).toBe(200);
      expect(res.body.principalPaise).toBe(10000000);
      expect(res.body.interestPaise).toBe(1200000);
      expect(res.body.totalRepaymentPaise).toBe(11200000);
      expect(res.body.principalRupees).toBe(100000);
      expect(res.body.interestRupees).toBe(12000);
      expect(res.body.totalRepaymentRupees).toBe(112000);
      expect(res.body.tenureDays).toBe(365);
      expect(res.body.annualInterestRateBps).toBe(1200);
    });

    it("returns accurate calculation for 30-day tenure (spot check: ₹100k, 30 days)", async () => {
      const res = await request(app)
        .get("/api/v1/loans/quote")
        .query({ principalRupees: 100000, tenureDays: 30 });

      expect(res.status).toBe(200);
      expect(res.body.principalPaise).toBe(10000000);
      expect(res.body.interestPaise).toBe(98630); // ₹986.30 in integer paise
      expect(res.body.totalRepaymentPaise).toBe(10098630);
      expect(res.body.interestRupees).toBe(986.3);
    });

    it("rejects when principal is below ₹50,000 minimum", async () => {
      const res = await request(app)
        .get("/api/v1/loans/quote")
        .query({ principalRupees: 40000, tenureDays: 60 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(JSON.stringify(res.body.details)).toMatch(
        /Principal must be at least ₹50,000/i,
      );
    });

    it("rejects when principal exceeds ₹500,000 maximum", async () => {
      const res = await request(app)
        .get("/api/v1/loans/quote")
        .query({ principalRupees: 600000, tenureDays: 60 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(JSON.stringify(res.body.details)).toMatch(
        /Principal cannot exceed ₹500,000/i,
      );
    });

    it("rejects when tenure is below 30 days minimum", async () => {
      const res = await request(app)
        .get("/api/v1/loans/quote")
        .query({ principalRupees: 100000, tenureDays: 15 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(JSON.stringify(res.body.details)).toMatch(
        /Tenure must be at least 30 days/i,
      );
    });

    it("rejects when tenure exceeds 365 days maximum", async () => {
      const res = await request(app)
        .get("/api/v1/loans/quote")
        .query({ principalRupees: 100000, tenureDays: 400 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(JSON.stringify(res.body.details)).toMatch(
        /Tenure cannot exceed 365 days/i,
      );
    });

    it("rejects when query parameters are missing", async () => {
      const res = await request(app).get("/api/v1/loans/quote");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("POST /api/v1/loans (Loan Application Preconditions & Lifecycle)", () => {
    it("returns 401 Unauthorized if no bearer token is supplied", async () => {
      const res = await request(app).post("/api/v1/loans").send({
        principalRupees: 100000,
        tenureDays: 180,
        salarySlipDocumentId: validSalarySlipDocId,
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 Bad Request when request body violates validation constraints", async () => {
      const res = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 20000, // < 50,000
          tenureDays: 15, // < 30
          salarySlipDocumentId: validSalarySlipDocId,
        });

      expect(res.status).toBe(400);
    });

    it("returns 422 Unprocessable Entity if borrower profile does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${noProfileBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 90,
          salarySlipDocumentId: validSalarySlipDocId,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/complete your personal details/i);
    });

    it("returns 422 Unprocessable Entity if borrower profile failed BRE check", async () => {
      const res = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${failedBreBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 90,
          salarySlipDocumentId: validSalarySlipDocId,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/credit eligibility/i);
    });

    it("returns 422 Unprocessable Entity if salary slip document belongs to another user", async () => {
      const res = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 90,
          salarySlipDocumentId: otherUserSalarySlipDocId, // belongs to otherBorrower
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/valid salary slip document/i);
    });

    it("returns 422 Unprocessable Entity if salary slip document does not exist in DB", async () => {
      const nonExistentDocId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 90,
          salarySlipDocumentId: nonExistentDocId,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/valid salary slip document/i);
    });

    it("creates a new loan application successfully when all preconditions pass", async () => {
      const res = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 180,
          salarySlipDocumentId: validSalarySlipDocId,
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/submitted successfully/i);

      const loan = res.body.loan;
      expect(loan.id).toBeDefined();
      expect(loan.loanReference).toMatch(/^LN-\d{4}-[A-F0-9]{6}$/);
      expect(loan.borrowerUserId).toBe(eligibleBorrowerUser._id.toString());
      expect(loan.salarySlipDocumentId).toBe(validSalarySlipDocId);
      expect(loan.principalPaise).toBe(10000000);
      expect(loan.tenureDays).toBe(180);
      expect(loan.annualInterestRateBps).toBe(1200);
      expect(loan.interestPaise).toBe(591781); // 100000 * 12 * 180 / 365 = 5917.808 -> 591781 paise
      expect(loan.totalRepaymentPaise).toBe(10591781);
      expect(loan.amountPaidPaise).toBe(0);
      expect(loan.outstandingPaise).toBe(10591781);
      expect(loan.status).toBe("APPLIED");

      // Verify status history
      expect(loan.statusHistory).toHaveLength(1);
      expect(loan.statusHistory[0].from).toBeNull();
      expect(loan.statusHistory[0].to).toBe("APPLIED");
      expect(loan.statusHistory[0].byUserId).toBe(
        eligibleBorrowerUser._id.toString(),
      );

      // Verify applicant snapshot
      expect(loan.applicantSnapshot.monthlySalaryPaise).toBe(7500000);
      expect(loan.applicantSnapshot.employmentMode).toBe("SALARIED");
      expect(loan.applicantSnapshot.ageAtApplication).toBe(31);

      // Verify DB persistence
      const dbLoan = await LoanModel.findById(loan.id);
      expect(dbLoan).toBeDefined();
      expect(dbLoan?.loanReference).toBe(loan.loanReference);
    });

    it("rejects with 409 Conflict if borrower already has an active open loan", async () => {
      // First application succeeds
      const firstRes = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 180,
          salarySlipDocumentId: validSalarySlipDocId,
        });
      expect(firstRes.status).toBe(201);

      // Second application for the same borrower must fail with 409
      const secondRes = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 80000,
          tenureDays: 60,
          salarySlipDocumentId: validSalarySlipDocId,
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error).toMatch(/already have an active loan/i);
    });
  });

  describe("GET /api/v1/loans/mine", () => {
    it("returns all loans belonging to the authenticated borrower", async () => {
      // Create a loan for eligible borrower
      await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 180,
          salarySlipDocumentId: validSalarySlipDocId,
        });

      const res = await request(app)
        .get("/api/v1/loans/mine")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loans).toHaveLength(1);
      expect(res.body.loans[0].borrowerUserId).toBe(
        eligibleBorrowerUser._id.toString(),
      );
    });

    it("returns empty array when authenticated borrower has no loans", async () => {
      const res = await request(app)
        .get("/api/v1/loans/mine")
        .set("Authorization", `Bearer ${otherBorrowerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loans).toEqual([]);
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/v1/loans/mine");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/loans/:id", () => {
    let createdLoanId: string;

    beforeEach(async () => {
      const applyRes = await request(app)
        .post("/api/v1/loans")
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`)
        .send({
          principalRupees: 100000,
          tenureDays: 180,
          salarySlipDocumentId: validSalarySlipDocId,
        });
      createdLoanId = applyRes.body.loan.id;
    });

    it("allows the loan owner borrower to view their loan details", async () => {
      const res = await request(app)
        .get(`/api/v1/loans/${createdLoanId}`)
        .set("Authorization", `Bearer ${eligibleBorrowerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loan.id).toBe(createdLoanId);
      expect(res.body.loan.principalPaise).toBe(10000000);
    });

    it("enforces IDOR protection: returns 403 Forbidden when another borrower attempts access", async () => {
      const res = await request(app)
        .get(`/api/v1/loans/${createdLoanId}`)
        .set("Authorization", `Bearer ${otherBorrowerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    it("allows internal operations staff (e.g. SANCTION officer) to view the loan", async () => {
      const res = await request(app)
        .get(`/api/v1/loans/${createdLoanId}`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loan.id).toBe(createdLoanId);
    });

    it("allows ADMIN to view any loan", async () => {
      const res = await request(app)
        .get(`/api/v1/loans/${createdLoanId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loan.id).toBe(createdLoanId);
    });

    it("returns 404 Not Found when loan ID does not exist", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .get(`/api/v1/loans/${nonExistentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Loan not found/i);
    });
  });
});
