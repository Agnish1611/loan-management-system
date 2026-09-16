import { z } from "zod";
import { fromPaise } from "./money.js";
import type { BreRuleName, BreVerdict, EmploymentMode } from "./index.js";

export const LEAD_STAGES = [
  "REGISTERED_ONLY",
  "PROFILE_DONE",
  "BRE_REJECTED",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const salesLeadQuerySchema = z.object({
  stage: z
    .enum([...LEAD_STAGES, "ALL"])
    .optional()
    .default("ALL"),
  search: z.string().trim().optional(),
});

export type SalesLeadQueryInput = z.infer<typeof salesLeadQuerySchema>;

export interface SalesLeadProfileInfo {
  panNumber: string;
  dateOfBirth: string;
  monthlySalaryPaise: number;
  monthlySalaryRupees: number;
  employmentMode: EmploymentMode;
}

export interface SalesLeadDto {
  userId: string;
  fullName: string;
  email: string;
  registeredAt: string;
  stage: LeadStage;
  profile?: SalesLeadProfileInfo;
  bre?: BreVerdict;
}

export function formatSalesLeadDto(doc: {
  _id: { toString(): string };
  fullName: string;
  email: string;
  createdAt: Date;
  stage: LeadStage;
  profile?: {
    panNumber: string;
    dateOfBirth: Date | string;
    monthlySalaryPaise: number;
    employmentMode: EmploymentMode;
    bre?: {
      passed: boolean;
      evaluatedAt: Date | string;
      ageAtEvaluation: number;
      results: Array<{
        rule: BreRuleName;
        passed: boolean;
        message: string;
      }>;
    } | null;
  } | null;
}): SalesLeadDto {
  const profile = doc.profile;
  let formattedProfile: SalesLeadProfileInfo | undefined = undefined;
  let formattedBre: BreVerdict | undefined = undefined;

  if (profile) {
    formattedProfile = {
      panNumber: profile.panNumber,
      dateOfBirth:
        typeof profile.dateOfBirth === "string"
          ? profile.dateOfBirth
          : profile.dateOfBirth.toISOString(),
      monthlySalaryPaise: profile.monthlySalaryPaise,
      monthlySalaryRupees: fromPaise(profile.monthlySalaryPaise),
      employmentMode: profile.employmentMode,
    };

    if (profile.bre) {
      formattedBre = {
        passed: profile.bre.passed,
        evaluatedAt:
          typeof profile.bre.evaluatedAt === "string"
            ? profile.bre.evaluatedAt
            : new Date(profile.bre.evaluatedAt).toISOString(),
        ageAtEvaluation: profile.bre.ageAtEvaluation,
        results: profile.bre.results.map((r) => ({
          rule: r.rule,
          passed: r.passed,
          message: r.message,
        })),
      };
    }
  }

  return {
    userId: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email,
    registeredAt: doc.createdAt.toISOString(),
    stage: doc.stage,
    profile: formattedProfile,
    bre: formattedBre,
  };
}
