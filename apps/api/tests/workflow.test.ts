import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import {
  UserModel,
  BorrowerProfileModel,
  DocumentModel,
  LoanModel,
} from "@/models/index.js";
import { authService } from "@/services/index.js";
import { calculateLoanTermsFromRupees, type LoanStatus } from "@repo/types";

describe("Phase 6: Loan Workflow State Machine & Ops Transition Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  // Users & Tokens
  let borrowerUser: any;
  let borrowerToken: string;

  let sanctionOfficerUser: any;
  let sanctionOfficerToken: string;

  let disbursementManagerUser: any;
  let disbursementManagerToken: string;

  let salesExecutiveUser: any;
  let salesExecutiveToken: string;

  let collectionOfficerUser: any;
  let collectionOfficerToken: string;

  let adminUser: any;
  let adminToken: string;

  let salarySlipDocId: string;

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

    // 1. Borrower
    borrowerUser = await UserModel.create({
      email: "rahul.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Rahul Sharma",
      role: "BORROWER",
    });
    borrowerToken = authService.generateToken(borrowerUser);

    // 2. Sanction Officer
    sanctionOfficerUser = await UserModel.create({
      email: "sanction@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sanction Officer",
      role: "SANCTION",
    });
    sanctionOfficerToken = authService.generateToken(sanctionOfficerUser);

    // 3. Disbursement Manager
    disbursementManagerUser = await UserModel.create({
      email: "disbursement@creditsea.com",
      passwordHash: "hash123",
      fullName: "Disbursement Manager",
      role: "DISBURSEMENT",
    });
    disbursementManagerToken = authService.generateToken(
      disbursementManagerUser,
    );

    // 4. Sales Executive
    salesExecutiveUser = await UserModel.create({
      email: "sales@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sales Executive",
      role: "SALES",
    });
    salesExecutiveToken = authService.generateToken(salesExecutiveUser);

    // 5. Collection Officer
    collectionOfficerUser = await UserModel.create({
      email: "collection@creditsea.com",
      passwordHash: "hash123",
      fullName: "Collection Officer",
      role: "COLLECTION",
    });
    collectionOfficerToken = authService.generateToken(collectionOfficerUser);

    // 6. Admin
    adminUser = await UserModel.create({
      email: "admin@creditsea.com",
      passwordHash: "hash123",
      fullName: "System Admin",
      role: "ADMIN",
    });
    adminToken = authService.generateToken(adminUser);

    // Salary slip document
    const doc = await DocumentModel.create({
      ownerUserId: borrowerUser._id,
      docType: "SALARY_SLIP",
      provider: "LOCAL",
      storageKey: `salary-slips/${borrowerUser._id}/slip.pdf`,
      bucket: null,
      originalFilename: "rahul-salary-slip.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024 * 50,
    });
    salarySlipDocId = doc._id.toString();
  });

  // Helper to create a loan in any designated state
  async function createTestLoan(
    status: LoanStatus,
    referenceSuffix = "001",
    borrowerId: any = borrowerUser._id,
  ) {
    const terms = calculateLoanTermsFromRupees(100000, 180);
    const history: any[] = [
      {
        from: null,
        to: "APPLIED",
        byUserId: borrowerId,
        reason: null,
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
    ];

    if (status === "SANCTIONED" || status === "DISBURSED") {
      history.push({
        from: "APPLIED",
        to: "SANCTIONED",
        byUserId: sanctionOfficerUser._id,
        reason: "KYC verified",
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      });
    }

    if (status === "DISBURSED") {
      history.push({
        from: "SANCTIONED",
        to: "DISBURSED",
        byUserId: disbursementManagerUser._id,
        reason: "Funds disbursed",
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
      });
    }

    if (status === "REJECTED") {
      history.push({
        from: "APPLIED",
        to: "REJECTED",
        byUserId: sanctionOfficerUser._id,
        reason: "Income criteria failed",
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      });
    }

    return LoanModel.create({
      loanReference: `LN-2026-TEST${referenceSuffix}`,
      borrowerUserId: borrowerId,
      salarySlipDocumentId: new Types.ObjectId(salarySlipDocId),
      principalPaise: terms.principalPaise,
      tenureDays: terms.tenureDays,
      annualInterestRateBps: terms.annualInterestRateBps,
      interestPaise: terms.interestPaise,
      totalRepaymentPaise: terms.totalRepaymentPaise,
      amountPaidPaise: 0,
      outstandingPaise: terms.totalRepaymentPaise,
      status,
      statusHistory: history,
      applicantSnapshot: {
        monthlySalaryPaise: 7500000,
        employmentMode: "SALARIED",
        ageAtApplication: 31,
      },
    });
  }

  describe("POST /api/v1/ops/loans/:id/sanction", () => {
    it("allows SANCTION officer to approve an APPLIED loan with 200 OK", async () => {
      const loan = await createTestLoan("APPLIED", "SANCT1");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`)
        .send({ notes: "Credit committee approved" });

      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe("SANCTIONED");
      expect(res.body.loan.statusHistory).toHaveLength(2);

      const latestHistory =
        res.body.loan.statusHistory[res.body.loan.statusHistory.length - 1];
      expect(latestHistory.from).toBe("APPLIED");
      expect(latestHistory.to).toBe("SANCTIONED");
      expect(latestHistory.byUserId).toBe(sanctionOfficerUser._id.toString());
      expect(latestHistory.reason).toBe("Credit committee approved");

      // Verify DB update
      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.status).toBe("SANCTIONED");
    });

    it("allows ADMIN to sanction an APPLIED loan", async () => {
      const loan = await createTestLoan("APPLIED", "SANCT2");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe("SANCTIONED");
    });

    it("rejects unauthorized roles with 403 Forbidden", async () => {
      const loan = await createTestLoan("APPLIED", "SANCT3");

      // DISBURSEMENT manager attempting to sanction
      const resDisb = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${disbursementManagerToken}`);
      expect(resDisb.status).toBe(403);

      // SALES executive attempting to sanction
      const resSales = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${salesExecutiveToken}`);
      expect(resSales.status).toBe(403);

      // BORROWER attempting to sanction
      const resBorrower = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resBorrower.status).toBe(403);
    });

    it("rejects transition on already SANCTIONED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("SANCTIONED", "SANCT4");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(
        /Cannot transition loan from SANCTIONED to SANCTIONED/,
      );
    });

    it("rejects sanctioning a DISBURSED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("DISBURSED", "SANCT5");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(
        /Cannot transition loan from DISBURSED to SANCTIONED/,
      );
    });

    it("rejects sanctioning a REJECTED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("REJECTED", "SANCT6");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/sanction`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/terminal state REJECTED/);
    });

    it("returns 404 Not Found when loan ID does not exist", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const res = await request(app)
        .post(`/api/v1/ops/loans/${nonExistentId}/sanction`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/ops/loans/:id/reject", () => {
    it("returns 422 Unprocessable Entity when rejection reason is missing", async () => {
      const loan = await createTestLoan("APPLIED", "REJ1");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(
        /Rejection reason must be between 5 and 500 characters/,
      );
    });

    it("returns 422 Unprocessable Entity when rejection reason is under 5 characters", async () => {
      const loan = await createTestLoan("APPLIED", "REJ2");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`)
        .send({ reason: "Bad" });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(
        /Rejection reason must be between 5 and 500 characters/,
      );
    });

    it("allows SANCTION officer to reject an APPLIED loan with valid reason", async () => {
      const loan = await createTestLoan("APPLIED", "REJ3");
      const reason = "Bank statements show insufficient monthly credit balance";

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`)
        .send({ reason });

      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe("REJECTED");

      const latestHistory =
        res.body.loan.statusHistory[res.body.loan.statusHistory.length - 1];
      expect(latestHistory.from).toBe("APPLIED");
      expect(latestHistory.to).toBe("REJECTED");
      expect(latestHistory.reason).toBe(reason);
      expect(latestHistory.byUserId).toBe(sanctionOfficerUser._id.toString());

      // Verify DB update
      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.status).toBe("REJECTED");
    });

    it("allows ADMIN to reject an APPLIED loan", async () => {
      const loan = await createTestLoan("APPLIED", "REJ4");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Rejected by Administrator due to high risk profile" });

      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe("REJECTED");
    });

    it("rejects unauthorized roles from rejecting loans with 403 Forbidden", async () => {
      const loan = await createTestLoan("APPLIED", "REJ5");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${disbursementManagerToken}`)
        .send({ reason: "Disbursement manager attempting rejection" });

      expect(res.status).toBe(403);
    });

    it("rejects rejecting an already SANCTIONED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("SANCTIONED", "REJ6");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`)
        .send({ reason: "Attempting to reject sanctioned loan" });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(
        /Cannot transition loan from SANCTIONED to REJECTED/,
      );
    });

    it("rejects rejecting a DISBURSED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("DISBURSED", "REJ7");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/reject`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`)
        .send({ reason: "Attempting to reject disbursed loan" });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(
        /Cannot transition loan from DISBURSED to REJECTED/,
      );
    });
  });

  describe("POST /api/v1/ops/loans/:id/disburse", () => {
    it("allows DISBURSEMENT manager to disburse a SANCTIONED loan with 200 OK", async () => {
      const loan = await createTestLoan("SANCTIONED", "DISB1");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${disbursementManagerToken}`)
        .send({ notes: "Transferred via NEFT batch #9921" });

      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe("DISBURSED");

      const latestHistory =
        res.body.loan.statusHistory[res.body.loan.statusHistory.length - 1];
      expect(latestHistory.from).toBe("SANCTIONED");
      expect(latestHistory.to).toBe("DISBURSED");
      expect(latestHistory.reason).toBe("Transferred via NEFT batch #9921");
      expect(latestHistory.byUserId).toBe(
        disbursementManagerUser._id.toString(),
      );

      // Verify DB update
      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.status).toBe("DISBURSED");
    });

    it("allows ADMIN to disburse a SANCTIONED loan", async () => {
      const loan = await createTestLoan("SANCTIONED", "DISB2");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe("DISBURSED");
    });

    it("rejects unauthorized roles from disbursing loans with 403 Forbidden", async () => {
      const loan = await createTestLoan("SANCTIONED", "DISB3");

      // SANCTION officer attempting to disburse
      const resSanct = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);
      expect(resSanct.status).toBe(403);

      // BORROWER attempting to disburse
      const resBorrower = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resBorrower.status).toBe(403);
    });

    it("rejects disbursing an APPLIED loan (skipping sanction) with 409 Conflict", async () => {
      const loan = await createTestLoan("APPLIED", "DISB4");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${disbursementManagerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(
        /Cannot transition loan from APPLIED to DISBURSED/,
      );
    });

    it("rejects disbursing an already DISBURSED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("DISBURSED", "DISB5");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${disbursementManagerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(
        /Cannot transition loan from DISBURSED to DISBURSED/,
      );
    });

    it("rejects disbursing a REJECTED loan with 409 Conflict", async () => {
      const loan = await createTestLoan("REJECTED", "DISB6");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/disburse`)
        .set("Authorization", `Bearer ${disbursementManagerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/terminal state REJECTED/);
    });
  });

  describe("Operations Queues (GET /api/v1/ops/sanction/loans & GET /api/v1/ops/disbursement/loans)", () => {
    let b1: any, b2: any, b3: any, b4: any;

    beforeEach(async () => {
      b1 = await UserModel.create({
        email: "borrower.q1@creditsea.com",
        passwordHash: "hash123",
        fullName: "Rahul Sharma",
        role: "BORROWER",
      });
      b2 = await UserModel.create({
        email: "borrower.q2@creditsea.com",
        passwordHash: "hash123",
        fullName: "Ananya Verma",
        role: "BORROWER",
      });
      b3 = await UserModel.create({
        email: "borrower.q3@creditsea.com",
        passwordHash: "hash123",
        fullName: "Karan Kapoor",
        role: "BORROWER",
      });
      b4 = await UserModel.create({
        email: "borrower.q4@creditsea.com",
        passwordHash: "hash123",
        fullName: "Priya Patel",
        role: "BORROWER",
      });

      await createTestLoan("APPLIED", "Q_APP1", b1._id);
      await createTestLoan("APPLIED", "Q_APP2", b2._id);
      await createTestLoan("SANCTIONED", "Q_SANCT1", b3._id);
      await createTestLoan("DISBURSED", "Q_DISB1", b4._id);
    });

    it("returns APPLIED loans queue for SANCTION officer with populated borrower details", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sanction/loans")
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loans).toHaveLength(2);
      expect(res.body.loans.every((l: any) => l.status === "APPLIED")).toBe(
        true,
      );

      // Verify populated borrower
      const borrowerNames = res.body.loans.map(
        (l: any) => l.borrower?.fullName,
      );
      expect(borrowerNames).toContain("Rahul Sharma");
      expect(borrowerNames).toContain("Ananya Verma");
    });

    it("allows ADMIN to view sanction queue", async () => {
      const res = await request(app)
        .get("/api/v1/ops/sanction/loans")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loans).toHaveLength(2);
    });

    it("blocks DISBURSEMENT officer and BORROWER from viewing sanction queue with 403", async () => {
      const resDisb = await request(app)
        .get("/api/v1/ops/sanction/loans")
        .set("Authorization", `Bearer ${disbursementManagerToken}`);
      expect(resDisb.status).toBe(403);

      const resBorrower = await request(app)
        .get("/api/v1/ops/sanction/loans")
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resBorrower.status).toBe(403);
    });

    it("returns SANCTIONED loans queue for DISBURSEMENT manager", async () => {
      const res = await request(app)
        .get("/api/v1/ops/disbursement/loans")
        .set("Authorization", `Bearer ${disbursementManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loans).toHaveLength(1);
      expect(res.body.loans[0].status).toBe("SANCTIONED");
      expect(res.body.loans[0].borrower.fullName).toBe("Karan Kapoor");
    });

    it("blocks SANCTION officer and BORROWER from viewing disbursement queue with 403", async () => {
      const resSanct = await request(app)
        .get("/api/v1/ops/disbursement/loans")
        .set("Authorization", `Bearer ${sanctionOfficerToken}`);
      expect(resSanct.status).toBe(403);

      const resBorrower = await request(app)
        .get("/api/v1/ops/disbursement/loans")
        .set("Authorization", `Bearer ${borrowerToken}`);
      expect(resBorrower.status).toBe(403);
    });

    describe("Global Ledger & Operations Analytics (GET /api/v1/ops/loans, /activity, /stats)", () => {
      it("allows ops officer to query all loans with status filter and search", async () => {
        // Query ALL
        const resAll = await request(app)
          .get("/api/v1/ops/loans")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(resAll.status).toBe(200);
        expect(resAll.body.loans.length).toBeGreaterThanOrEqual(4);
        expect(resAll.body.count).toBeGreaterThanOrEqual(4);

        // Query by status filter
        const resSanctioned = await request(app)
          .get("/api/v1/ops/loans?status=SANCTIONED")
          .set("Authorization", `Bearer ${sanctionOfficerToken}`);

        expect(resSanctioned.status).toBe(200);
        expect(resSanctioned.body.loans).toHaveLength(1);
        expect(resSanctioned.body.loans[0].loanReference).toContain("Q_SANCT1");

        // Query by search keyword
        const resSearch = await request(app)
          .get("/api/v1/ops/loans?search=Karan")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(resSearch.status).toBe(200);
        expect(resSearch.body.loans).toHaveLength(1);
        expect(resSearch.body.loans[0].borrower.fullName).toBe("Karan Kapoor");
      });

      it("returns recent activity audit events with operator details", async () => {
        const res = await request(app)
          .get("/api/v1/ops/activity?limit=5")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.activity)).toBe(true);
        expect(res.body.activity.length).toBeGreaterThan(0);
        expect(res.body.activity[0]).toHaveProperty("loanReference");
        expect(res.body.activity[0]).toHaveProperty("to");
      });

      it("returns portfolio stats with total disbursed, collected, and outstanding principal", async () => {
        const res = await request(app)
          .get("/api/v1/ops/stats")
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("totalDisbursedPaise");
        expect(res.body).toHaveProperty("totalCollectedPaise");
        expect(res.body).toHaveProperty("outstandingPaise");
        expect(typeof res.body.totalDisbursedPaise).toBe("number");
      });

      it("blocks BORROWER from accessing global ledger or analytics with 403", async () => {
        const resLoans = await request(app)
          .get("/api/v1/ops/loans")
          .set("Authorization", `Bearer ${borrowerToken}`);
        expect(resLoans.status).toBe(403);

        const resActivity = await request(app)
          .get("/api/v1/ops/activity")
          .set("Authorization", `Bearer ${borrowerToken}`);
        expect(resActivity.status).toBe(403);

        const resStats = await request(app)
          .get("/api/v1/ops/stats")
          .set("Authorization", `Bearer ${borrowerToken}`);
        expect(resStats.status).toBe(403);
      });

      it("GET /api/v1/ops/loans/:id returns enriched loan with borrower name, email, and PAN", async () => {
        const bTest = await UserModel.create({
          email: "test.pan@creditsea.com",
          passwordHash: "hash123",
          fullName: "Aarav Patel",
          role: "BORROWER",
        });

        await BorrowerProfileModel.create({
          userId: bTest._id,
          panNumber: "ABCDE1234F",
          dateOfBirth: new Date("1995-05-15"),
          monthlySalaryPaise: 5000000,
          employmentMode: "SALARIED",
          bre: {
            passed: true,
            evaluatedAt: new Date(),
            ageAtEvaluation: 29,
            results: [],
          },
        });

        const testLoan = await createTestLoan("APPLIED", "TEST_PAN", bTest._id);

        const res = await request(app)
          .get(`/api/v1/ops/loans/${testLoan._id}`)
          .set("Authorization", `Bearer ${sanctionOfficerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.loan).toBeDefined();
        expect(res.body.loan.id).toBe(testLoan._id.toString());
        expect(res.body.loan.borrower).toBeDefined();
        expect(res.body.loan.borrower.fullName).toBe("Aarav Patel");
        expect(res.body.loan.borrower.email).toBe("test.pan@creditsea.com");
        expect(res.body.loan.borrower.profile).toBeDefined();
        expect(res.body.loan.borrower.profile.panNumber).toBe("ABCDE1234F");
        expect(res.body.loan.borrower.profile.bre).toBeDefined();
        expect(res.body.loan.borrower.profile.bre.passed).toBe(true);
      });

      it("GET /api/v1/ops/loans/:id returns 404 for non-existent loan", async () => {
        const fakeId = new Types.ObjectId().toString();
        const res = await request(app)
          .get(`/api/v1/ops/loans/${fakeId}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
      });

      it("GET /api/v1/ops/loans/:id blocks BORROWER with 403", async () => {
        const testLoan = await createTestLoan("APPLIED");
        const res = await request(app)
          .get(`/api/v1/ops/loans/${testLoan._id}`)
          .set("Authorization", `Bearer ${borrowerToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});
