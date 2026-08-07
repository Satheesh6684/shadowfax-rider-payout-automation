import { Router } from "express";
import { authRouter } from "./auth.routes";
import { rateCardRouter } from "./rateCard.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/rate-cards", rateCardRouter);

// Phase 2  → apiRouter.use("/payment-config", paymentConfigRouter);
// Phase 3  → apiRouter.use("/upload", uploadRouter);
// Phase 4  → apiRouter.use("/review", reviewRouter);
// Phase 5  → apiRouter.use("/calculate", calculationRouter);
// Phase 6  → apiRouter.use("/reports", reportsRouter);
// Phase 7  → apiRouter.use("/riders", riderRouter);
