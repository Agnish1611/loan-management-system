import { Router } from "express";
import { authRouter } from "@/routes/auth.routes.js";

export const apiV1Router: Router = Router();

apiV1Router.use("/auth", authRouter);

export * from "@/routes/auth.routes.js";
