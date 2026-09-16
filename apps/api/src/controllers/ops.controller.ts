import type { Request, Response, NextFunction } from "express";
import {
  loanWorkflowService,
  type LoanWorkflowService,
  paymentService,
  type PaymentService,
  salesService,
  type SalesService,
} from "@/services/index.js";
import type {
  LoanStatus,
  SalesLeadQueryInput,
  OpsLoansQueryInput,
} from "@repo/types";

export class OpsController {
  constructor(
    private service: LoanWorkflowService = loanWorkflowService,
    private payments: PaymentService = paymentService,
    private sales: SalesService = salesService,
  ) {}

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

  getCollectionLoans = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const loans = await this.payments.getCollectionQueue();

      res.status(200).json({
        loans,
      });
    } catch (err) {
      next(err);
    }
  };

  recordPayment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.payments.recordPayment(id, req.body, req.user!);

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  getLoanPayments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const payments = await this.payments.getLoanPayments(id, req.user!);

      res.status(200).json({
        payments,
      });
    } catch (err) {
      next(err);
    }
  };

  getSalesLeads = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = req.query as unknown as SalesLeadQueryInput;
      const leads = await this.sales.getLeads(query);

      res.status(200).json({
        leads,
        count: leads.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getSalesLeadById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const lead = await this.sales.getLeadById(id);

      res.status(200).json({
        lead,
      });
    } catch (err) {
      next(err);
    }
  };

  getAllLoans = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = req.query as unknown as OpsLoansQueryInput;
      const loans = await this.service.getAllLoans(query);

      res.status(200).json({
        loans,
        count: loans.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getLoanById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const loan = await this.service.getOpsLoanById(id);

      res.status(200).json({
        loan,
      });
    } catch (err) {
      next(err);
    }
  };

  getRecentActivity = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const activity = await this.service.getRecentActivity(limit);

      res.status(200).json({
        activity,
      });
    } catch (err) {
      next(err);
    }
  };

  getStats = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const allLoans = await this.service.getAllLoans();
      const totalDisbursedPaise = allLoans
        .filter((l) => ["DISBURSED", "CLOSED"].includes(l.status))
        .reduce((sum, l) => sum + l.principalPaise, 0);
      const totalCollectedPaise = allLoans.reduce(
        (sum, l) => sum + l.amountPaidPaise,
        0,
      );
      const outstandingPaise = allLoans
        .filter((l) => l.status === "DISBURSED")
        .reduce((sum, l) => sum + l.outstandingPaise, 0);

      res.status(200).json({
        totalDisbursedPaise,
        totalCollectedPaise,
        outstandingPaise,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const opsController = new OpsController();
