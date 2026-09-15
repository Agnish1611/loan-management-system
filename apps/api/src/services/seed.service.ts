import bcrypt from "bcryptjs";
import { userRepository, type UserRepository } from "@/repositories/index.js";
import type { Role } from "@repo/types";

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
    description: "Standard demo borrower account",
  },
  {
    email: "borrower.lead@creditsea.com",
    fullName: "Priya Patel",
    role: "BORROWER",
    description: "Registered lead borrower account",
  },
  {
    email: "borrower.brefail@creditsea.com",
    fullName: "Vikram Singh",
    role: "BORROWER",
    description: "BRE rejected demo borrower account",
  },
];

export const DEFAULT_SEED_PASSWORD = "Password123!";

export class SeedService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async seed(password = DEFAULT_SEED_PASSWORD): Promise<{
    seededCount: number;
    users: Array<{ id: string; email: string; fullName: string; role: Role }>;
  }> {
    const passwordHash = await bcrypt.hash(password, 12);
    const seededUsers = [];

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
    }

    return {
      seededCount: seededUsers.length,
      users: seededUsers,
    };
  }
}

export const seedService = new SeedService();
