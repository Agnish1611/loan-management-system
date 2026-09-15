import {
  BorrowerProfileModel,
  type IBorrowerProfile,
  type IBorrowerProfileDocument,
} from "@/models/index.js";

export class BorrowerProfileRepository {
  async findByUserId(userId: string): Promise<IBorrowerProfileDocument | null> {
    return BorrowerProfileModel.findOne({ userId }).exec();
  }

  async findByPan(panNumber: string): Promise<IBorrowerProfileDocument | null> {
    return BorrowerProfileModel.findOne({
      panNumber: panNumber.trim().toUpperCase(),
    }).exec();
  }

  async upsertByUserId(
    userId: string,
    data: {
      panNumber: string;
      dateOfBirth: Date;
      monthlySalaryPaise: number;
      employmentMode: IBorrowerProfile["employmentMode"];
      bre: IBorrowerProfile["bre"];
    },
  ): Promise<IBorrowerProfileDocument> {
    return BorrowerProfileModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          panNumber: data.panNumber.trim().toUpperCase(),
          dateOfBirth: data.dateOfBirth,
          monthlySalaryPaise: data.monthlySalaryPaise,
          employmentMode: data.employmentMode,
          bre: data.bre,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  }
}

export const borrowerProfileRepository = new BorrowerProfileRepository();
