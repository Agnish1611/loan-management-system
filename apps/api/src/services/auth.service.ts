import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/index.js";
import { userRepository, type UserRepository } from "@/repositories/index.js";
import { ConflictError, UnauthorizedError } from "@/errors/index.js";
import type { IUserDocument } from "@/models/index.js";
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  SanitizedUser,
} from "@repo/types";

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const exists = await this.userRepo.existsByEmail(input.email);
    if (exists) {
      throw new ConflictError("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: "BORROWER",
    });

    const token = this.generateToken(user);
    return {
      user: this.sanitize(user),
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmailWithPassword(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.isActive) {
      throw new UnauthorizedError("Account is inactive");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = this.generateToken(user);
    return {
      user: this.sanitize(user),
      token,
    };
  }

  async getCurrentUser(userId: string): Promise<SanitizedUser> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or inactive");
    }

    return this.sanitize(user);
  }

  public generateToken(user: IUserDocument): string {
    return jwt.sign(
      { sub: user._id.toString(), role: user.role },
      env.JWT_SECRET,
      { expiresIn: "1d" },
    );
  }

  public sanitize(user: IUserDocument): SanitizedUser {
    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
