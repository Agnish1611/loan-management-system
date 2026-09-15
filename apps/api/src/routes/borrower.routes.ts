import { Router } from "express";
import { borrowerController } from "@/controllers/index.js";
import { requireAuth, validateBody } from "@/middleware/index.js";
import { borrowerProfileUpsertSchema } from "@repo/types";

export const borrowerRouter: Router = Router();

borrowerRouter.put(
  "/profile",
  requireAuth,
  validateBody(borrowerProfileUpsertSchema),
  borrowerController.upsertProfile,
);

borrowerRouter.get("/profile", requireAuth, borrowerController.getProfile);
