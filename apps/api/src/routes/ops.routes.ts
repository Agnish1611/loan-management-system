import { Router } from "express";
import { opsController } from "@/controllers/index.js";
import { requireAuth, requireRole, validateBody } from "@/middleware/index.js";
import { loanSanctionSchema, loanDisburseSchema } from "@repo/types";
import { ValidationError } from "@/errors/index.js";
import type { Request, Response, NextFunction } from "express";

export const opsRouter: Router = Router();

function validateRejectPayload(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const reason = req.body?.reason;
  if (
    !reason ||
    typeof reason !== "string" ||
    reason.trim().length < 5 ||
    reason.trim().length > 500
  ) {
    return next(
      new ValidationError(
        "Rejection reason must be between 5 and 500 characters",
      ),
    );
  }
  req.body.reason = reason.trim();
  next();
}

// Sanction module routes
opsRouter.get(
  "/sanction/loans",
  requireAuth,
  requireRole("SANCTION"),
  opsController.getSanctionLoans,
);

opsRouter.post(
  "/loans/:id/sanction",
  requireAuth,
  requireRole("SANCTION"),
  validateBody(loanSanctionSchema),
  opsController.sanctionLoan,
);

opsRouter.post(
  "/loans/:id/reject",
  requireAuth,
  requireRole("SANCTION"),
  validateRejectPayload,
  opsController.rejectLoan,
);

// Disbursement module routes
opsRouter.get(
  "/disbursement/loans",
  requireAuth,
  requireRole("DISBURSEMENT"),
  opsController.getDisbursementLoans,
);

opsRouter.post(
  "/loans/:id/disburse",
  requireAuth,
  requireRole("DISBURSEMENT"),
  validateBody(loanDisburseSchema),
  opsController.disburseLoan,
);
