import bcrypt from "bcryptjs";
import {
  userRepository,
  type UserRepository,
  borrowerProfileRepository,
  type BorrowerProfileRepository,
} from "@/repositories/index.js";
import {
  evaluateBre,
  toPaise,
  type Role,
  type BorrowerProfileDto,
} from "@repo/types";

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
    description: "Standard demo borrower account (BRE passed)",
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
  ) {}

  async seed(password = DEFAULT_SEED_PASSWORD): Promise<{
    seededCount: number;
    users: Array<{ id: string; email: string; fullName: string; role: Role }>;
    profiles: Array<{
      userId: string;
      panNumber: string;
      brePassed: boolean;
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
    }

    return {
      seededCount: seededUsers.length,
      users: seededUsers,
      profiles: seededProfiles,
    };
  }
}

export const seedService = new SeedService();
