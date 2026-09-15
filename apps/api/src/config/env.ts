import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  JWT_SECRET: z
    .string()
    .min(10, "JWT_SECRET must be at least 10 characters long")
    .default(
      process.env.NODE_ENV === "test"
        ? "test-jwt-secret-key-1234567890"
        : (undefined as unknown as string),
    ),
  MONGO_URI: z.string().default("mongodb://localhost:27017/lms"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
