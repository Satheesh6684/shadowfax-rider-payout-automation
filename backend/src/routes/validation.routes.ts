import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listIssuesQuerySchema,
  listRunsQuerySchema,
  runValidationSchema,
  validationSummaryQuerySchema,
} from "../validators/validation.validators";
import {
  getValidationAuditLogs,
  getValidationSummary,
  listValidationIssues,
  listValidationRuns,
  runValidation,
} from "../controllers/validation.controller";

export const validationRouter = Router();

validationRouter.use(requireAuth);

validationRouter.get("/summary", validate(validationSummaryQuerySchema, "query"), getValidationSummary);
validationRouter.get("/audit-logs", getValidationAuditLogs);
validationRouter.get("/runs", validate(listRunsQuerySchema, "query"), listValidationRuns);
validationRouter.get("/runs/:runId/issues", validate(listIssuesQuerySchema, "query"), listValidationIssues);
validationRouter.post("/run", requirePermission("validation:run"), validate(runValidationSchema), runValidation);
