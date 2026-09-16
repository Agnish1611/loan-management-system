import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { env } from "@/config/index.js";
import {
  LocalStorageDriver,
  S3StorageDriver,
} from "@/services/storage/index.js";
import {
  userRepository,
  type UserRepository,
  borrowerProfileRepository,
  type BorrowerProfileRepository,
  documentRepository,
  type DocumentRepository,
} from "@/repositories/index.js";
import { DocumentModel, LoanModel } from "@/models/index.js";
import {
  evaluateBre,
  toPaise,
  calculateLoanTermsFromRupees,
  type Role,
  type LoanStatus,
} from "@repo/types";

const SAMPLE_SALARY_SLIP_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 175 >>
stream
BT
/F1 20 Tf
72 710 Td
(CREDITSEA FINANCIAL - VERIFIED SALARY SLIP) Tj
/F1 12 Tf
0 -30 Td
(Employee: Demo Borrower) Tj
0 -20 Td
(Employment Status: Confirmed / Full-time) Tj
0 -20 Td
(Net Monthly Salary: INR 50,000) Tj
0 -20 Td
(Verified for Loan Underwriting) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000225 00000 n 
0000000303 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
528
%%EOF
`,
);

export interface SeedUserDefinition {
  email: string;
  fullName: string;
  role: Role;
  description: string;
}

export const CANONICAL_SEED_USERS: SeedUserDefinition[] = [
  {
    email: "admin@creditsea.com",
    fullName: "System Administrator",
    role: "ADMIN",
    description: "Full access across all operations modules",
  },
  {
    email: "sales@creditsea.com",
    fullName: "Sales Executive",
    role: "SALES",
    description: "Pre-application stage & lead tracking",
  },
  {
    email: "sanction@creditsea.com",
    fullName: "Sanction Officer",
    role: "SANCTION",
    description: "Loan review, approval, and rejection",
  },
  {
    email: "disbursement@creditsea.com",
    fullName: "Disbursement Manager",
    role: "DISBURSEMENT",
    description: "Loan disbursement and fund release",
  },
  {
    email: "collection@creditsea.com",
    fullName: "Collection Officer",
    role: "COLLECTION",
    description: "Payment recording and UTR reconciliation",
  },
  {
    email: "borrower@creditsea.com",
    fullName: "Rahul Sharma",
    role: "BORROWER",
    description: "Demo borrower with APPLIED loan",
  },
  {
    email: "borrower.sanctioned@creditsea.com",
    fullName: "Ananya Verma",
    role: "BORROWER",
    description: "Demo borrower with SANCTIONED loan",
  },
  {
    email: "borrower.disbursed@creditsea.com",
    fullName: "Karan Kapoor",
    role: "BORROWER",
    description: "Demo borrower with DISBURSED loan",
  },
  {
    email: "borrower.lead@creditsea.com",
    fullName: "Priya Patel",
    role: "BORROWER",
    description: "Registered lead borrower account (no profile yet)",
  },
  {
    email: "borrower.brefail@creditsea.com",
    fullName: "Vikram Singh",
    role: "BORROWER",
    description: "BRE rejected demo borrower account",
  },
];

export const DEMO_BORROWER_PROFILES = [
  {
    email: "borrower@creditsea.com",
    panNumber: "ABCDE1234F",
    dateOfBirth: "1995-05-15",
    monthlySalary: 75000,
    employmentMode: "SALARIED" as const,
  },
  {
    email: "borrower.sanctioned@creditsea.com",
    panNumber: "GHIJK5678L",
    dateOfBirth: "1993-08-20",
    monthlySalary: 90000,
    employmentMode: "SALARIED" as const,
  },
  {
    email: "borrower.disbursed@creditsea.com",
    panNumber: "MNOPQ9012R",
    dateOfBirth: "1990-11-10",
    monthlySalary: 120000,
    employmentMode: "SALARIED" as const,
  },
  {
    email: "borrower.brefail@creditsea.com",
    panNumber: "XYZAB5678C",
    dateOfBirth: "2005-01-01",
    monthlySalary: 15000,
    employmentMode: "UNEMPLOYED" as const,
  },
];

export const DEFAULT_SEED_PASSWORD = "Password123!";

export class SeedService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private borrowerRepo: BorrowerProfileRepository = borrowerProfileRepository,
    private docRepo: DocumentRepository = documentRepository,
  ) {}

  async seed(password = DEFAULT_SEED_PASSWORD): Promise<{
    seededCount: number;
    users: Array<{ id: string; email: string; fullName: string; role: Role }>;
    profiles: Array<{
      userId: string;
      panNumber: string;
      brePassed: boolean;
    }>;
    loans: Array<{
      reference: string;
      borrowerEmail: string;
      status: LoanStatus;
      principalPaise: number;
      totalRepaymentPaise: number;
    }>;
  }> {
    const passwordHash = await bcrypt.hash(password, 12);
    const seededUsers = [];
    const userMap: Record<string, string> = {};

    for (const def of CANONICAL_SEED_USERS) {
      const doc = await this.userRepo.upsertByEmail(def.email, {
        fullName: def.fullName,
        role: def.role,
        passwordHash,
        isActive: true,
      });

      seededUsers.push({
        id: doc._id.toString(),
        email: doc.email,
        fullName: doc.fullName,
        role: doc.role,
      });
      userMap[doc.email] = doc._id.toString();
    }

    const seededProfiles = [];
    const profileMap: Record<string, any> = {};
    for (const p of DEMO_BORROWER_PROFILES) {
      const userId = userMap[p.email];
      if (!userId) continue;

      const dob = new Date(p.dateOfBirth);
      const breVerdict = evaluateBre({
        panNumber: p.panNumber,
        dateOfBirth: dob,
        monthlySalary: p.monthlySalary,
        employmentMode: p.employmentMode,
      });

      const profileDoc = await this.borrowerRepo.upsertByUserId(userId, {
        panNumber: p.panNumber,
        dateOfBirth: dob,
        monthlySalaryPaise: toPaise(p.monthlySalary),
        employmentMode: p.employmentMode,
        bre: breVerdict,
      });

      seededProfiles.push({
        userId,
        panNumber: profileDoc.panNumber,
        brePassed: profileDoc.bre.passed,
      });
      profileMap[p.email] = profileDoc;
    }

    // Seed documents for borrowers who have active loans
    const documentMap: Record<string, string> = {};
    const borrowerEmailsWithLoans = [
      "borrower@creditsea.com",
      "borrower.sanctioned@creditsea.com",
      "borrower.disbursed@creditsea.com",
    ];

    for (const email of borrowerEmailsWithLoans) {
      const userId = userMap[email];
      if (!userId) continue;

      const storageKey = `salary-slips/${userId}/seed-salary-slip.pdf`;

      // Upload to whichever driver is actually configured for this
      // environment — mirrors StorageService's own selection so seeded
      // documents behave exactly like real uploads would. Falls back to
      // local disk only if the configured S3 upload itself fails.
      const useS3 =
        env.STORAGE_DRIVER === "s3" &&
        !!env.AWS_ACCESS_KEY_ID &&
        !!env.AWS_SECRET_ACCESS_KEY;

      let putResult: { key: string; bucket: string | null };

      if (useS3) {
        try {
          const s3Driver = new S3StorageDriver();
          putResult = await s3Driver.put({
            key: storageKey,
            body: SAMPLE_SALARY_SLIP_PDF,
            mimeType: "application/pdf",
          });
        } catch (s3Err) {
          console.warn(
            `[Seed] S3 upload failed for ${email}, falling back to local disk:`,
            s3Err,
          );
          const localDriver = new LocalStorageDriver();
          putResult = await localDriver.put({
            key: storageKey,
            body: SAMPLE_SALARY_SLIP_PDF,
            mimeType: "application/pdf",
          });
        }
      } else {
        const localDriver = new LocalStorageDriver();
        putResult = await localDriver.put({
          key: storageKey,
          body: SAMPLE_SALARY_SLIP_PDF,
          mimeType: "application/pdf",
        });
      }

      const provider = putResult.bucket ? "S3" : "LOCAL";

      const existingDoc = await DocumentModel.findOne({
        ownerUserId: userId,
        docType: "SALARY_SLIP",
      });

      if (existingDoc) {
        existingDoc.provider = provider;
        existingDoc.storageKey = putResult.key;
        existingDoc.bucket = putResult.bucket;
        existingDoc.sizeBytes = SAMPLE_SALARY_SLIP_PDF.length;
        existingDoc.mimeType = "application/pdf";
        existingDoc.originalFilename = "salary-slip-2026.pdf";
        await existingDoc.save();
        documentMap[email] = existingDoc._id.toString();
      } else {
        const newDoc = await this.docRepo.create({
          ownerUserId: userId,
          docType: "SALARY_SLIP",
          provider,
          storageKey: putResult.key,
          bucket: putResult.bucket,
          originalFilename: "salary-slip-2026.pdf",
          mimeType: "application/pdf",
          sizeBytes: SAMPLE_SALARY_SLIP_PDF.length,
        });
        documentMap[email] = newDoc._id.toString();
      }
    }

    // Seed demo loans in each status: APPLIED, SANCTIONED, DISBURSED
    const sanctionUserId = userMap["sanction@creditsea.com"];
    const disbursementUserId = userMap["disbursement@creditsea.com"];

    const demoLoanConfigs = [
      {
        borrowerEmail: "borrower@creditsea.com",
        reference: "LN-2026-APPLIED1",
        principalRupees: 100000,
        tenureDays: 180,
        status: "APPLIED" as LoanStatus,
        history: (bId: string) => [
          {
            from: null,
            to: "APPLIED" as LoanStatus,
            byUserId: new Types.ObjectId(bId),
            reason: null,
            at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
          },
        ],
      },
      {
        borrowerEmail: "borrower.sanctioned@creditsea.com",
        reference: "LN-2026-SANCTION1",
        principalRupees: 200000,
        tenureDays: 90,
        status: "SANCTIONED" as LoanStatus,
        history: (bId: string) => [
          {
            from: null,
            to: "APPLIED" as LoanStatus,
            byUserId: new Types.ObjectId(bId),
            reason: null,
            at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
          },
          {
            from: "APPLIED" as LoanStatus,
            to: "SANCTIONED" as LoanStatus,
            byUserId: sanctionUserId
              ? new Types.ObjectId(sanctionUserId)
              : null,
            reason: "KYC and income criteria verified",
            at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          },
        ],
      },
      {
        borrowerEmail: "borrower.disbursed@creditsea.com",
        reference: "LN-2026-DISBURSE1",
        principalRupees: 150000,
        tenureDays: 60,
        status: "DISBURSED" as LoanStatus,
        history: (bId: string) => [
          {
            from: null,
            to: "APPLIED" as LoanStatus,
            byUserId: new Types.ObjectId(bId),
            reason: null,
            at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
          },
          {
            from: "APPLIED" as LoanStatus,
            to: "SANCTIONED" as LoanStatus,
            byUserId: sanctionUserId
              ? new Types.ObjectId(sanctionUserId)
              : null,
            reason: "Approved by Credit Committee",
            at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
          },
          {
            from: "SANCTIONED" as LoanStatus,
            to: "DISBURSED" as LoanStatus,
            byUserId: disbursementUserId
              ? new Types.ObjectId(disbursementUserId)
              : null,
            reason: "Funds transferred to borrower bank account",
            at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
          },
        ],
      },
    ];

    const seededLoans = [];
    for (const item of demoLoanConfigs) {
      const borrowerId = userMap[item.borrowerEmail];
      const docId = documentMap[item.borrowerEmail];
      const profile = profileMap[item.borrowerEmail];

      if (!borrowerId || !docId || !profile) continue;

      const terms = calculateLoanTermsFromRupees(
        item.principalRupees,
        item.tenureDays,
      );

      const applicantSnapshot = {
        monthlySalaryPaise: profile.monthlySalaryPaise,
        employmentMode: profile.employmentMode,
        ageAtApplication: profile.bre.ageAtEvaluation,
      };

      const loanDoc = await LoanModel.findOneAndUpdate(
        { loanReference: item.reference },
        {
          $set: {
            loanReference: item.reference,
            borrowerUserId: new Types.ObjectId(borrowerId),
            salarySlipDocumentId: new Types.ObjectId(docId),
            principalPaise: terms.principalPaise,
            tenureDays: terms.tenureDays,
            annualInterestRateBps: terms.annualInterestRateBps,
            interestPaise: terms.interestPaise,
            totalRepaymentPaise: terms.totalRepaymentPaise,
            amountPaidPaise: 0,
            outstandingPaise: terms.totalRepaymentPaise,
            status: item.status,
            statusHistory: item.history(borrowerId),
            applicantSnapshot,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      seededLoans.push({
        reference: loanDoc.loanReference,
        borrowerEmail: item.borrowerEmail,
        status: loanDoc.status,
        principalPaise: loanDoc.principalPaise,
        totalRepaymentPaise: loanDoc.totalRepaymentPaise,
      });
    }

    return {
      seededCount: seededUsers.length,
      users: seededUsers,
      profiles: seededProfiles,
      loans: seededLoans,
    };
  }
}

export const seedService = new SeedService();
