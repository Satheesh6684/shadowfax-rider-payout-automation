import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  exceptionSummaryQuerySchema,
  ignoreExceptionSchema,
  listExceptionsQuerySchema,
  reprocessSchema,
  resolveExceptionSchema,
} from "../validators/exception.validators";
import {
  getExceptionAuditLogs,
  getExceptionSummary,
  ignoreException,
  listExceptions,
  reopenException,
  reprocessCalculation,
  reprocessValidation,
  resolveException,
} from "../controllers/exception.controller";

export const exceptionRouter = Router();

exceptionRouter.use(requireAuth);

exceptionRouter.get("/summary", validate(exceptionSummaryQuerySchema, "query"), getExceptionSummary);
exceptionRouter.get("/audit-logs", getExceptionAuditLogs);
exceptionRouter.get("/", validate(listExceptionsQuerySchema, "query"), listExceptions);

exceptionRouter.post("/reprocess-validation", requirePermission("validation:run"), validate(reprocessSchema), reprocessValidation);
exceptionRouter.post("/reprocess-calculation", requirePermission("calculation:run"), validate(reprocessSchema), reprocessCalculation);

exceptionRouter.patch("/:id/resolve", requirePermission("exceptions:resolve"), validate(resolveExceptionSchema), resolveException);
exceptionRouter.patch("/:id/ignore", requirePermission("exceptions:resolve"), validate(ignoreExceptionSchema), ignoreException);
exceptionRouter.patch("/:id/reopen", requirePermission("exceptions:resolve"), reopenException);
