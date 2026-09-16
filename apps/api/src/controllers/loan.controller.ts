import type { Request, Response, NextFunction } from "express";
import { loanService, type LoanService } from "@/services/index.js";
import type { LoanQuoteInput } from "@repo/types";

export class LoanController {
  constructor(private service: LoanService = loanService) {}

  quote = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const quote = this.service.getQuote(
        req.query as unknown as LoanQuoteInput,
      );
      res.status(200).json(quote);
    } catch (err) {
      next(err);
    }
  };

  apply = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const borrowerUserId = req.user!.id;
      const loan = await this.service.apply(borrowerUserId, req.body);

      res.status(201).json({
        message: "Loan application submitted successfully",
        loan,
      });
    } catch (err) {
      next(err);
    }
  };

  listMine = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const borrowerUserId = req.user!.id;
      const loans = await this.service.getMyLoans(borrowerUserId);

      res.status(200).json({
        loans,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const loan = await this.service.getLoanById(id, req.user!);

      res.status(200).json({
        loan,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const loanController = new LoanController();
