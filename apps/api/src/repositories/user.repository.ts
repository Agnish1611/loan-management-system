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
}

export const userRepository = new UserRepository();
