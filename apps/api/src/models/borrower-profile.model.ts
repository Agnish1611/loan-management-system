import { Schema, model, type Document, type Types } from "mongoose";
import {
  EMPLOYMENT_MODES,
  type EmploymentMode,
  type BreVerdict,
} from "@repo/types";

export interface IBorrowerProfile {
  userId: Types.ObjectId;
  panNumber: string;
  dateOfBirth: Date;
  monthlySalaryPaise: number;
  employmentMode: EmploymentMode;
  bre: BreVerdict;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBorrowerProfileDocument
  extends IBorrowerProfile, Document<Types.ObjectId> {}

const breRuleResultSchema = new Schema(
  {
    rule: {
      type: String,
      enum: ["PAN", "AGE", "SALARY", "EMPLOYMENT"],
      required: true,
    },
    passed: { type: Boolean, required: true },
    message: { type: String, required: true },
  },
  { _id: false },
);

const breVerdictSchema = new Schema(
  {
    passed: { type: Boolean, required: true },
    evaluatedAt: { type: Date, required: true },
    ageAtEvaluation: { type: Number, required: true },
    results: [breRuleResultSchema],
  },
  { _id: false },
);

const borrowerProfileSchema = new Schema<IBorrowerProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    panNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format"],
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    monthlySalaryPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    employmentMode: {
      type: String,
      enum: EMPLOYMENT_MODES,
      required: true,
    },
    bre: {
      type: breVerdictSchema,
      required: true,
    },
  },
  {
    collection: "borrower_profiles",
    timestamps: true,
  },
);

borrowerProfileSchema.index({ "bre.passed": 1, updatedAt: -1 });

export const BorrowerProfileModel = model<IBorrowerProfileDocument>(
  "BorrowerProfile",
  borrowerProfileSchema,
);
