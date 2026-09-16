import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

const envSchema = z
  .object({
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
    LOCAL_UPLOAD_DIR: z.string().default("uploads"),
    AWS_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.STORAGE_DRIVER === "s3") {
      if (!data.AWS_REGION) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "AWS_REGION is required when STORAGE_DRIVER is 's3'",
          path: ["AWS_REGION"],
        });
      }
      if (!data.S3_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "S3_BUCKET is required when STORAGE_DRIVER is 's3'",
          path: ["S3_BUCKET"],
        });
      }
      if (!data.AWS_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "AWS_ACCESS_KEY_ID is required when STORAGE_DRIVER is 's3'",
          path: ["AWS_ACCESS_KEY_ID"],
        });
      }
      if (!data.AWS_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "AWS_SECRET_ACCESS_KEY is required when STORAGE_DRIVER is 's3'",
          path: ["AWS_SECRET_ACCESS_KEY"],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "[config] Invalid environment variables:",
    parsed.error.format(),
  );
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
