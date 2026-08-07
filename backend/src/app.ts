import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { NotFoundError } from "./utils/AppError";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(requestLogger);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ success: true, status: "ok" });
  });

  app.use("/api", apiRouter);

  // Unmatched routes → 404 through the same centralized error shape
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.path}`));
  });

  // Must be registered last
  app.use(errorHandler);

  return app;
}
