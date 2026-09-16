import { UserModel, type IUserDocument } from "@/models/index.js";
import type { Role } from "@repo/types";

export class UserRepository {
  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: Role;
  }): Promise<IUserDocument> {
    return UserModel.create(data);
  }

  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select("+passwordHash")
      .exec();
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id).exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await UserModel.countDocuments({
      email: email.toLowerCase(),
    }).exec();
    return count > 0;
  }

  async upsertByEmail(
    email: string,
    data: {
      passwordHash: string;
      fullName: string;
      role: Role;
      isActive?: boolean;
    },
  ): Promise<IUserDocument> {
    return UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          fullName: data.fullName,
          role: data.role,
          passwordHash: data.passwordHash,
          isActive: data.isActive ?? true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  }

  async aggregateSalesLeads(filter: {
    stage?: string;
    search?: string;
  }): Promise<any[]> {
    const pipeline: any[] = [
      // 1. Only consider registered borrowers
      { $match: { role: "BORROWER" } },

      // 2. Lookup loans to find out if the borrower has applied for any loan
      {
        $lookup: {
          from: "loans",
          localField: "_id",
          foreignField: "borrowerUserId",
          as: "loans",
        },
      },

      // 3. Exclude borrowers who already have any loan (leads are borrowers with NO loans)
      { $match: { loans: { $size: 0 } } },

      // 4. Lookup borrower profile
      {
        $lookup: {
          from: "borrower_profiles",
          localField: "_id",
          foreignField: "userId",
          as: "profiles",
        },
      },

      // 5. Add single profile and compute lead stage
      {
        $addFields: {
          profile: { $arrayElemAt: ["$profiles", 0] },
        },
      },
      {
        $addFields: {
          stage: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$profile", null] }, null] },
              then: "REGISTERED_ONLY",
              else: {
                $cond: {
                  if: { $eq: ["$profile.bre.passed", true] },
                  then: "PROFILE_DONE",
                  else: "BRE_REJECTED",
                },
              },
            },
          },
        },
      },
    ];

    // 6. Optional stage filter
    if (filter.stage && filter.stage !== "ALL") {
      pipeline.push({ $match: { stage: filter.stage } });
    }

    // 7. Optional search filter
    if (filter.search && filter.search.trim().length > 0) {
      const searchRegex = new RegExp(filter.search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: searchRegex } },
            { email: { $regex: searchRegex } },
            { "profile.panNumber": { $regex: searchRegex } },
          ],
        },
      });
    }

    // 8. Sort by registration date newest first
    pipeline.push({ $sort: { createdAt: -1 } });

    // 9. Clean up temporary lookup arrays
    pipeline.push({
      $project: {
        passwordHash: 0,
        loans: 0,
        profiles: 0,
        __v: 0,
      },
    });

    return UserModel.aggregate(pipeline).exec();
  }
}

export const userRepository = new UserRepository();
