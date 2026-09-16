import { PaymentModel, type IPaymentDocument } from "@/models/index.js";

export class PaymentRepository {
  async create(data: {
    loanId: string;
    utrNumber: string;
    amountPaise: number;
    paidAt: Date;
    recordedByUserId: string;
    outstandingAfterPaise: number;
  }): Promise<IPaymentDocument> {
    return PaymentModel.create(data);
  }

  async findByLoanId(loanId: string): Promise<IPaymentDocument[]> {
    return PaymentModel.find({ loanId })
      .sort({ paidAt: -1, createdAt: -1 })
      .exec();
  }

  async findByUtr(utrNumber: string): Promise<IPaymentDocument | null> {
    return PaymentModel.findOne({ utrNumber }).exec();
  }

  async deleteById(id: string): Promise<IPaymentDocument | null> {
    return PaymentModel.findByIdAndDelete(id).exec();
  }
}

export const paymentRepository = new PaymentRepository();
