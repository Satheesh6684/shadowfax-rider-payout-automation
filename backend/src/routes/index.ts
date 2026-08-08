import { Router } from "express";
import { authRouter } from "./auth.routes";
import { rateCardRouter } from "./rateCard.routes";
import { paymentTypeRouter } from "./paymentType.routes";
import { uploadRouter } from "./upload.routes";
import { validationRouter } from "./validation.routes";
import { calculationRouter } from "./calculation.routes";
import { exceptionRouter } from "./exception.routes";
import { reportRouter } from "./report.routes";
import { riderRouter } from "./rider.routes";
import { userRouter } from "./user.routes";
import { settingsRouter } from "./settings.routes";
import { notificationRouter } from "./notification.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/rate-cards", rateCardRouter);
apiRouter.use("/payment-types", paymentTypeRouter);
apiRouter.use("/upload", uploadRouter);
apiRouter.use("/validation", validationRouter);
apiRouter.use("/calculate", calculationRouter);
apiRouter.use("/exceptions", exceptionRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/riders", riderRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/notifications", notificationRouter);
