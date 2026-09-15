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
}

export const userRepository = new UserRepository();
