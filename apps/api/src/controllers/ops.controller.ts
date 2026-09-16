import type { Request, Response, NextFunction } from "express";
import {
  loanWorkflowService,
  type LoanWorkflowService,
} from "@/services/index.js";
import type { LoanStatus } from "@repo/types";

export class OpsController {
  constructor(private service: LoanWorkflowService = loanWorkflowService) {}

  getSanctionLoans = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const status = (req.query.status as LoanStatus) || "APPLIED";
      const loans = await this.service.getSanctionQueue(status);

      res.status(200).json({
        loans,
      });
    } catch (err) {
      next(err);
    }
  };

  sanctionLoan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const notes = req.body?.notes;
      const loan = await this.service.sanctionLoan(id, req.user!, notes);

      res.status(200).json({
        message: "Loan sanctioned successfully",
        loan,
      });
    } catch (err) {
      next(err);
    }
  };

  rejectLoan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const reason = req.body?.reason;
      const loan = await this.service.rejectLoan(id, req.user!, reason);

      res.status(200).json({
        message: "Loan rejected successfully",
        loan,
      });
    } catch (err) {
      next(err);
    }
  };

  getDisbursementLoans = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const status = (req.query.status as LoanStatus) || "SANCTIONED";
      const loans = await this.service.getDisbursementQueue(status);

      res.status(200).json({
        loans,
      });
    } catch (err) {
      next(err);
    }
  };

  disburseLoan = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const notes = req.body?.notes;
      const loan = await this.service.disburseLoan(id, req.user!, notes);

      res.status(200).json({
        message: "Loan disbursed successfully",
        loan,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const opsController = new OpsController();
