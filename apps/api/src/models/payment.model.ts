import { Schema, model, type Document, type Types } from "mongoose";

export interface IPayment {
  loanId: Types.ObjectId;
  utrNumber: string;
  amountPaise: number;
  paidAt: Date;
  recordedByUserId: Types.ObjectId;
  outstandingAfterPaise: number;
  createdAt: Date;
}

export interface IPaymentDocument extends IPayment, Document<Types.ObjectId> {}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: "Loan",
      required: true,
      index: true,
    },
    utrNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    paidAt: {
      type: Date,
      required: true,
    },
    recordedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    outstandingAfterPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "payments",
    timestamps: { createdAt: true, updatedAt: false },
  },
);

paymentSchema.index({ loanId: 1, paidAt: -1 });

export const PaymentModel = model<IPaymentDocument>("Payment", paymentSchema);
