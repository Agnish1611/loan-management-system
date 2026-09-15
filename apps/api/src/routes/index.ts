import { Router } from "express";
import { authRouter } from "@/routes/auth.routes.js";
import { borrowerRouter } from "@/routes/borrower.routes.js";

export const apiV1Router: Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/borrower", borrowerRouter);

export * from "@/routes/auth.routes.js";
export * from "@/routes/borrower.routes.js";
