import { Router } from "express";
import { authRouter } from "@/routes/auth.routes.js";
import { borrowerRouter } from "@/routes/borrower.routes.js";
import { documentRouter } from "@/routes/document.routes.js";
import { loanRouter } from "@/routes/loan.routes.js";

export const apiV1Router: Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/borrower", borrowerRouter);
apiV1Router.use("/documents", documentRouter);
apiV1Router.use("/loans", loanRouter);

export * from "@/routes/auth.routes.js";
export * from "@/routes/borrower.routes.js";
export * from "@/routes/document.routes.js";
export * from "@/routes/loan.routes.js";
