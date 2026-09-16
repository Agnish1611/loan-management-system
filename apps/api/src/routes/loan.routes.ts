import { Router } from "express";
import { loanController } from "@/controllers/index.js";
import {
  requireAuth,
  validateBody,
  validateQuery,
} from "@/middleware/index.js";
import { loanApplySchema, loanQuoteSchema } from "@repo/types";

export const loanRouter: Router = Router();

loanRouter.get("/quote", validateQuery(loanQuoteSchema), loanController.quote);
loanRouter.post(
  "/",
  requireAuth,
  validateBody(loanApplySchema),
  loanController.apply,
);
loanRouter.get("/mine", requireAuth, loanController.listMine);
loanRouter.get("/:id", requireAuth, loanController.getById);
