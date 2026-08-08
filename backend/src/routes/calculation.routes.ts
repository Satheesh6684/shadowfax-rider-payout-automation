import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  calculationSummaryQuerySchema,
  listCalculationResultsQuerySchema,
  listCalculationRunsQuerySchema,
  riderLogsQuerySchema,
  runCalculationSchema,
} from "../validators/calculation.validators";
import {
  getCalculationAuditLogs,
  getCalculationSummary,
  getRiderCalculationLogs,
  listCalculationResults,
  listCalculationRuns,
  runCalculation,
} from "../controllers/calculation.controller";

export const calculationRouter = Router();

calculationRouter.use(requireAuth);

calculationRouter.get("/summary", validate(calculationSummaryQuerySchema, "query"), getCalculationSummary);
calculationRouter.get("/audit-logs", getCalculationAuditLogs);
calculationRouter.get("/runs", validate(listCalculationRunsQuerySchema, "query"), listCalculationRuns);
calculationRouter.get("/results", validate(listCalculationResultsQuerySchema, "query"), listCalculationResults);
calculationRouter.get("/riders/:riderId/logs", validate(riderLogsQuerySchema, "query"), getRiderCalculationLogs);
calculationRouter.post("/run", requirePermission("calculation:run"), validate(runCalculationSchema), runCalculation);
