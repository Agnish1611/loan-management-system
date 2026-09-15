import {
  borrowerProfileRepository,
  type BorrowerProfileRepository,
} from "@/repositories/index.js";
import { ConflictError, NotFoundError } from "@/errors/index.js";
import type { IBorrowerProfileDocument } from "@/models/index.js";
import {
  evaluateBre,
  toPaise,
  type BorrowerProfileUpsertInput,
  type BorrowerProfileDto,
  type BreVerdict,
} from "@repo/types";

export class BorrowerService {
  constructor(
    private profileRepo: BorrowerProfileRepository = borrowerProfileRepository,
  ) {}

  async upsertProfile(
    userId: string,
    input: BorrowerProfileUpsertInput,
  ): Promise<{ profile: BorrowerProfileDto; breVerdict: BreVerdict }> {
    const existingByPan = await this.profileRepo.findByPan(input.panNumber);
    if (existingByPan && existingByPan.userId.toString() !== userId) {
      throw new ConflictError("PAN is already registered to another account");
    }

    const dob = new Date(input.dateOfBirth);
    const breVerdict = evaluateBre({
      panNumber: input.panNumber,
      dateOfBirth: dob,
      monthlySalary: input.monthlySalary,
      employmentMode: input.employmentMode,
    });

    const profileDoc = await this.profileRepo.upsertByUserId(userId, {
      panNumber: input.panNumber,
      dateOfBirth: dob,
      monthlySalaryPaise: toPaise(input.monthlySalary),
      employmentMode: input.employmentMode,
      bre: breVerdict,
    });

    return {
      profile: this.formatProfile(profileDoc),
      breVerdict,
    };
  }

  async getProfile(userId: string): Promise<BorrowerProfileDto> {
    const profileDoc = await this.profileRepo.findByUserId(userId);
    if (!profileDoc) {
      throw new NotFoundError("Borrower profile not found");
    }

    return this.formatProfile(profileDoc);
  }

  public formatProfile(doc: IBorrowerProfileDocument): BorrowerProfileDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      panNumber: doc.panNumber,
      dateOfBirth: doc.dateOfBirth.toISOString(),
      monthlySalaryPaise: doc.monthlySalaryPaise,
      employmentMode: doc.employmentMode,
      bre: doc.bre,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

export const borrowerService = new BorrowerService();
