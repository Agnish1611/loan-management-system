import { Router } from "express";
import { documentController } from "@/controllers/index.js";
import { requireAuth, uploadMiddleware } from "@/middleware/index.js";

export const documentRouter: Router = Router();

documentRouter.post(
  "/",
  requireAuth,
  uploadMiddleware.single("file"),
  documentController.upload,
);

documentRouter.get("/mine", requireAuth, documentController.listMine);
documentRouter.get("/:id", requireAuth, documentController.getById);
documentRouter.get("/:id/content", requireAuth, documentController.getContent);
