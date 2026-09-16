import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { connectDB, disconnectDB } from "@repo/database";
import { createApp } from "@/app.js";
import {
  UserModel,
  DocumentModel,
  LoanModel,
  PaymentModel,
} from "@/models/index.js";
import { authService } from "@/services/index.js";
import { calculateLoanTermsFromRupees, type LoanStatus } from "@repo/types";

describe("Phase 7: Collection & Repayment Engine Integration Tests", () => {
  let mongod: MongoMemoryServer;
  const app = createApp();

  // Users & Tokens
  let borrowerUser: any;
  let borrowerToken: string;

  let otherBorrowerUser: any;
  let otherBorrowerToken: string;

  let collectionOfficerUser: any;
  let collectionOfficerToken: string;

  let sanctionOfficerUser: any;
  let sanctionOfficerToken: string;

  let disbursementManagerUser: any;
  let disbursementManagerToken: string;

  let salesExecutiveUser: any;
  let salesExecutiveToken: string;

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
    await PaymentModel.deleteMany({});
    await LoanModel.deleteMany({});
    await DocumentModel.deleteMany({});
    await UserModel.deleteMany({});

    // 1. Borrower (Rahul)
    borrowerUser = await UserModel.create({
      email: "rahul.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Rahul Sharma",
      role: "BORROWER",
    });
    borrowerToken = authService.generateToken(borrowerUser);

    // 2. Other Borrower (Ananya)
    otherBorrowerUser = await UserModel.create({
      email: "ananya.borrower@creditsea.com",
      passwordHash: "hash123",
      fullName: "Ananya Verma",
      role: "BORROWER",
    });
    otherBorrowerToken = authService.generateToken(otherBorrowerUser);

    // 3. Collection Officer
    collectionOfficerUser = await UserModel.create({
      email: "collection@creditsea.com",
      passwordHash: "hash123",
      fullName: "Collection Officer",
      role: "COLLECTION",
    });
    collectionOfficerToken = authService.generateToken(collectionOfficerUser);

    // 4. Sanction Officer
    sanctionOfficerUser = await UserModel.create({
      email: "sanction@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sanction Officer",
      role: "SANCTION",
    });
    sanctionOfficerToken = authService.generateToken(sanctionOfficerUser);

    // 5. Disbursement Manager
    disbursementManagerUser = await UserModel.create({
      email: "disbursement@creditsea.com",
      passwordHash: "hash123",
      fullName: "Disbursement Manager",
      role: "DISBURSEMENT",
    });
    disbursementManagerToken = authService.generateToken(
      disbursementManagerUser,
    );

    // 6. Sales Executive
    salesExecutiveUser = await UserModel.create({
      email: "sales@creditsea.com",
      passwordHash: "hash123",
      fullName: "Sales Executive",
      role: "SALES",
    });
    salesExecutiveToken = authService.generateToken(salesExecutiveUser);

    // 7. Admin
    adminUser = await UserModel.create({
      email: "admin@creditsea.com",
      passwordHash: "hash123",
      fullName: "System Admin",
      role: "ADMIN",
    });
    adminToken = authService.generateToken(adminUser);

    // Salary slip doc
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

  async function createTestLoan(
    status: LoanStatus,
    referenceSuffix = "001",
    borrowerId: any = borrowerUser._id,
    customPrincipalRupees = 100000,
    customTenureDays = 180,
  ) {
    const terms = calculateLoanTermsFromRupees(
      customPrincipalRupees,
      customTenureDays,
    );
    const history: any[] = [
      {
        from: null,
        to: "APPLIED",
        byUserId: borrowerId,
        reason: null,
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
    ];

    if (
      status === "SANCTIONED" ||
      status === "DISBURSED" ||
      status === "CLOSED"
    ) {
      history.push({
        from: "APPLIED",
        to: "SANCTIONED",
        byUserId: sanctionOfficerUser._id,
        reason: "Approved",
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      });
    }

    if (status === "DISBURSED" || status === "CLOSED") {
      history.push({
        from: "SANCTIONED",
        to: "DISBURSED",
        byUserId: disbursementManagerUser._id,
        reason: "Disbursed",
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      });
    }

    if (status === "CLOSED") {
      history.push({
        from: "DISBURSED",
        to: "CLOSED",
        byUserId: null,
        reason: "Fully repaid. Auto-closed by system.",
        at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
      });
    }

    return LoanModel.create({
      loanReference: `LN-2026-PAY${referenceSuffix}`,
      borrowerUserId: borrowerId,
      salarySlipDocumentId: new Types.ObjectId(salarySlipDocId),
      principalPaise: terms.principalPaise,
      tenureDays: terms.tenureDays,
      annualInterestRateBps: terms.annualInterestRateBps,
      interestPaise: terms.interestPaise,
      totalRepaymentPaise: terms.totalRepaymentPaise,
      amountPaidPaise: status === "CLOSED" ? terms.totalRepaymentPaise : 0,
      outstandingPaise: status === "CLOSED" ? 0 : terms.totalRepaymentPaise,
      status,
      statusHistory: history,
      applicantSnapshot: {
        monthlySalaryPaise: 7500000,
        employmentMode: "SALARIED",
        ageAtApplication: 31,
      },
    });
  }

  describe("POST /api/v1/ops/loans/:id/payments (Partial & Full Repayments)", () => {
    it("successfully records a partial payment, decrements balance, and keeps status DISBURSED", async () => {
      const loan = await createTestLoan("DISBURSED", "PART1");
      const partialAmount = 5000000; // ₹50,000

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "HDFC9876543210",
          amountPaise: partialAmount,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Payment recorded successfully/);

      // Verify payment details
      const payment = res.body.payment;
      expect(payment.utrNumber).toBe("HDFC9876543210");
      expect(payment.amountPaise).toBe(partialAmount);
      expect(payment.amountRupees).toBe(50000);
      expect(payment.outstandingAfterPaise).toBe(
        loan.totalRepaymentPaise - partialAmount,
      );
      expect(payment.recordedByUserId).toBe(
        collectionOfficerUser._id.toString(),
      );

      // Verify updated loan in response
      const updatedLoan = res.body.loan;
      expect(updatedLoan.status).toBe("DISBURSED");
      expect(updatedLoan.amountPaidPaise).toBe(partialAmount);
      expect(updatedLoan.outstandingPaise).toBe(
        loan.totalRepaymentPaise - partialAmount,
      );

      // Verify DB persistence
      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.amountPaidPaise).toBe(partialAmount);
      expect(dbLoan?.outstandingPaise).toBe(
        loan.totalRepaymentPaise - partialAmount,
      );
      expect(dbLoan?.status).toBe("DISBURSED");

      const dbPayment = await PaymentModel.findOne({
        utrNumber: "HDFC9876543210",
      });
      expect(dbPayment).toBeDefined();
      expect(dbPayment?.amountPaise).toBe(partialAmount);
    });

    it("auto-closes loan when payment exactly equals remaining outstanding balance", async () => {
      const loan = await createTestLoan("DISBURSED", "FULL1");
      const totalRepayment = loan.totalRepaymentPaise;

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "ICICI1122334455",
          amountPaise: totalRepayment,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Fully repaid and closed/i);

      const payment = res.body.payment;
      expect(payment.amountPaise).toBe(totalRepayment);
      expect(payment.outstandingAfterPaise).toBe(0);

      const updatedLoan = res.body.loan;
      expect(updatedLoan.status).toBe("CLOSED");
      expect(updatedLoan.amountPaidPaise).toBe(totalRepayment);
      expect(updatedLoan.outstandingPaise).toBe(0);

      // Verify DB loan state
      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.status).toBe("CLOSED");
      expect(dbLoan?.outstandingPaise).toBe(0);
      expect(dbLoan?.amountPaidPaise).toBe(totalRepayment);

      // Verify system auto-close statusHistory entry
      const latestHistory =
        dbLoan?.statusHistory[dbLoan.statusHistory.length - 1];
      expect(latestHistory?.from).toBe("DISBURSED");
      expect(latestHistory?.to).toBe("CLOSED");
      expect(latestHistory?.byUserId).toBeNull(); // system-triggered
      expect(latestHistory?.reason).toMatch(/Auto-closed by system/i);
    });

    it("allows ADMIN to record payments", async () => {
      const loan = await createTestLoan("DISBURSED", "ADM1");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          utrNumber: "ADMINUTR12345",
          amountPaise: 1000000,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.loan.amountPaidPaise).toBe(1000000);
    });
  });

  describe("Global Unique UTR Enforcement", () => {
    it("rejects duplicate UTR number on the same loan with 409 Conflict", async () => {
      const loan = await createTestLoan("DISBURSED", "UTR_DUP1");
      const utr = "GLOBAL_UTR_999999";

      // First payment succeeds
      const firstRes = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: utr,
          amountPaise: 2000000,
          paidAt: new Date().toISOString(),
        });
      expect(firstRes.status).toBe(201);

      // Second payment on same loan with same UTR fails
      const secondRes = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: utr,
          amountPaise: 1000000,
          paidAt: new Date().toISOString(),
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.error).toMatch(/already been recorded/i);
    });

    it("rejects duplicate UTR number across different loans with 409 Conflict", async () => {
      const loan1 = await createTestLoan(
        "DISBURSED",
        "UTR_DIFF1",
        borrowerUser._id,
      );
      const loan2 = await createTestLoan(
        "DISBURSED",
        "UTR_DIFF2",
        otherBorrowerUser._id,
      );
      const sharedUtr = "CROSS_LOAN_UTR_777";

      // First loan payment succeeds
      const res1 = await request(app)
        .post(`/api/v1/ops/loans/${loan1._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: sharedUtr,
          amountPaise: 2000000,
          paidAt: new Date().toISOString(),
        });
      expect(res1.status).toBe(201);

      // Second loan payment using same UTR fails
      const res2 = await request(app)
        .post(`/api/v1/ops/loans/${loan2._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: sharedUtr,
          amountPaise: 1500000,
          paidAt: new Date().toISOString(),
        });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toMatch(/already been recorded/i);

      // Verify loan2 balance was not altered
      const dbLoan2 = await LoanModel.findById(loan2._id);
      expect(dbLoan2?.amountPaidPaise).toBe(0);
    });
  });

  describe("Overpayment & Balance Guard", () => {
    it("rejects payment exceeding outstanding balance with 422 Unprocessable Entity", async () => {
      const loan = await createTestLoan("DISBURSED", "OVER1");
      const excessiveAmount = loan.outstandingPaise + 1; // 1 paise over

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "OVERPAY_UTR_123",
          amountPaise: excessiveAmount,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/exceeds outstanding balance/i);

      // Verify nothing persisted
      const dbPayment = await PaymentModel.findOne({
        utrNumber: "OVERPAY_UTR_123",
      });
      expect(dbPayment).toBeNull();

      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.amountPaidPaise).toBe(0);
      expect(dbLoan?.outstandingPaise).toBe(loan.totalRepaymentPaise);
    });
  });

  describe("Loan Status Constraints & Ineligible Loans", () => {
    it("rejects payments on APPLIED loans with 409 Conflict", async () => {
      const loan = await createTestLoan("APPLIED", "INEL_APP");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "INEL_UTR_1",
          amountPaise: 500000,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Only DISBURSED loans accept repayments/i);
    });

    it("rejects payments on SANCTIONED loans with 409 Conflict", async () => {
      const loan = await createTestLoan("SANCTIONED", "INEL_SANCT");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "INEL_UTR_2",
          amountPaise: 500000,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Only DISBURSED loans accept repayments/i);
    });

    it("rejects payments on already CLOSED loans with 409 Conflict", async () => {
      const loan = await createTestLoan("CLOSED", "INEL_CLOSED");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "INEL_UTR_3",
          amountPaise: 500000,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Only DISBURSED loans accept repayments/i);
    });
  });

  describe("Validation Edge Cases", () => {
    it("rejects payment date in the future with 422 Unprocessable Entity", async () => {
      const loan = await createTestLoan("DISBURSED", "FUT_DATE");
      const futureDate = new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 7,
      ).toISOString(); // 7 days in future

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "FUTURE_UTR_123",
          amountPaise: 500000,
          paidAt: futureDate,
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/Payment date cannot be in the future/i);
    });

    it("rejects non-positive payment amounts with 400 Bad Request", async () => {
      const loan = await createTestLoan("DISBURSED", "ZERO_AMT");

      const res = await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "ZERO_UTR_123",
          amountPaise: 0,
          paidAt: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  describe("Concurrency Race Guard ($gte Overpayment Protection)", () => {
    it("prevents overpayment under concurrent requests", async () => {
      // Create a loan with valid bounds: principal ₹50,000 (5,000,000 paise) for 30 days
      const loan = await createTestLoan(
        "DISBURSED",
        "CONCURRENCY_TEST",
        borrowerUser._id,
        50000,
        30,
      );

      // Two concurrent payments each attempting to pay 3,000,000 paise
      // Sum = 6,000,000 > 5,049,315. Exactly ONE must succeed and ONE must fail.
      const p1 = request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "CONC_UTR_1",
          amountPaise: 3000000,
          paidAt: new Date().toISOString(),
        });

      const p2 = request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "CONC_UTR_2",
          amountPaise: 3000000,
          paidAt: new Date().toISOString(),
        });

      const [res1, res2] = await Promise.all([p1, p2]);

      const successResponses = [res1, res2].filter((r) => r.status === 201);
      const failedResponses = [res1, res2].filter(
        (r) => r.status === 409 || r.status === 422,
      );

      expect(successResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(1);

      // Verify DB final state
      const dbLoan = await LoanModel.findById(loan._id);
      expect(dbLoan?.amountPaidPaise).toBe(3000000);
      expect(dbLoan?.outstandingPaise).toBe(loan.totalRepaymentPaise - 3000000);

      const dbPayments = await PaymentModel.find({ loanId: loan._id });
      expect(dbPayments).toHaveLength(1);
    });
  });

  describe("RBAC Authorization Matrix", () => {
    it("blocks unauthorized roles from recording payments with 403 Forbidden", async () => {
      const loan = await createTestLoan("DISBURSED", "RBAC_PAY1");

      const rolesBlocked = [
        { name: "SANCTION", token: sanctionOfficerToken },
        { name: "DISBURSEMENT", token: disbursementManagerToken },
        { name: "SALES", token: salesExecutiveToken },
        { name: "BORROWER", token: borrowerToken },
      ];

      for (const roleDef of rolesBlocked) {
        const res = await request(app)
          .post(`/api/v1/ops/loans/${loan._id}/payments`)
          .set("Authorization", `Bearer ${roleDef.token}`)
          .send({
            utrNumber: `BLOCKED_UTR_${roleDef.name}`,
            amountPaise: 1000000,
            paidAt: new Date().toISOString(),
          });

        expect(res.status).toBe(403);
      }
    });

    it("blocks unauthorized roles from viewing collection queue with 403", async () => {
      const rolesBlocked = [
        { name: "SANCTION", token: sanctionOfficerToken },
        { name: "DISBURSEMENT", token: disbursementManagerToken },
        { name: "SALES", token: salesExecutiveToken },
        { name: "BORROWER", token: borrowerToken },
      ];

      for (const roleDef of rolesBlocked) {
        const res = await request(app)
          .get("/api/v1/ops/collection/loans")
          .set("Authorization", `Bearer ${roleDef.token}`);

        expect(res.status).toBe(403);
      }
    });
  });

  describe("Collection Queue & Payment History Endpoints", () => {
    it("returns active DISBURSED loans in collection queue for COLLECTION officer", async () => {
      await createTestLoan("DISBURSED", "QUEUE1");

      const res = await request(app)
        .get("/api/v1/ops/collection/loans")
        .set("Authorization", `Bearer ${collectionOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.loans.length).toBeGreaterThanOrEqual(1);
      expect(res.body.loans.every((l: any) => l.status === "DISBURSED")).toBe(
        true,
      );

      // Verify populated borrower
      const targetLoan = res.body.loans[0];
      expect(targetLoan.borrower).toBeDefined();
      expect(targetLoan.borrower.fullName).toBe("Rahul Sharma");
      expect(targetLoan.borrower.email).toBe("rahul.borrower@creditsea.com");
    });

    it("allows COLLECTION officer to view payment history on GET /api/v1/ops/loans/:id/payments", async () => {
      const loan = await createTestLoan("DISBURSED", "HIST1");

      // Record 2 payments
      await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "HIST_UTR_001",
          amountPaise: 2000000,
          paidAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        });

      await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "HIST_UTR_002",
          amountPaise: 3000000,
          paidAt: new Date().toISOString(),
        });

      const res = await request(app)
        .get(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(2);
      expect(res.body.payments[0].utrNumber).toBe("HIST_UTR_002");
      expect(res.body.payments[1].utrNumber).toBe("HIST_UTR_001");
    });

    it("allows borrower to view their own payments via GET /api/v1/loans/:id/payments", async () => {
      const loan = await createTestLoan("DISBURSED", "BORROWER_HIST1");

      await request(app)
        .post(`/api/v1/ops/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${collectionOfficerToken}`)
        .send({
          utrNumber: "BORROWER_VIEW_UTR",
          amountPaise: 2500000,
          paidAt: new Date().toISOString(),
        });

      // Rahul views his own payments
      const res = await request(app)
        .get(`/api/v1/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${borrowerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(1);
      expect(res.body.payments[0].utrNumber).toBe("BORROWER_VIEW_UTR");
      expect(res.body.payments[0].amountPaise).toBe(2500000);
    });

    it("enforces IDOR: blocks other borrower from viewing payments via GET /api/v1/loans/:id/payments", async () => {
      const loan = await createTestLoan("DISBURSED", "IDOR_PAY1");

      // Ananya attempts to view Rahul's payments
      const res = await request(app)
        .get(`/api/v1/loans/${loan._id}/payments`)
        .set("Authorization", `Bearer ${otherBorrowerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied to payment history/i);
    });
  });
});
