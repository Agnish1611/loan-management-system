import type { Request, Response, NextFunction } from "express";
import { borrowerService, type BorrowerService } from "@/services/index.js";

export class BorrowerController {
  constructor(private service: BorrowerService = borrowerService) {}

  upsertProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { profile, breVerdict } = await this.service.upsertProfile(
        userId,
        req.body,
      );

      if (!breVerdict.passed) {
        res.status(422).json({
          message: "BRE eligibility check failed",
          code: "BRE_REJECTED",
          profile,
          results: breVerdict.results,
        });
        return;
      }

      res.status(200).json({
        message: "Borrower profile saved and eligible",
        profile,
        results: breVerdict.results,
      });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.service.getProfile(userId);

      res.status(200).json({
        profile,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const borrowerController = new BorrowerController();
