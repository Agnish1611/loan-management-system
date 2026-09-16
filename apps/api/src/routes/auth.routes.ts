import { Router } from "express";
import { authController } from "@/controllers/index.js";
import { validateBody, requireAuth } from "@/middleware/index.js";
import { registerSchema, loginSchema } from "@repo/types";

export const authRouter: Router = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  authController.register,
);
authRouter.post("/login", validateBody(loginSchema), authController.login);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
