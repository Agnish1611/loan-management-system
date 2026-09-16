import { Router } from "express";
import { authRouter } from "@/routes/auth.routes.js";
import { borrowerRouter } from "@/routes/borrower.routes.js";
import { documentRouter } from "@/routes/document.routes.js";

export const apiV1Router: Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/borrower", borrowerRouter);
apiV1Router.use("/documents", documentRouter);

export * from "@/routes/auth.routes.js";
export * from "@/routes/borrower.routes.js";
export * from "@/routes/document.routes.js";
