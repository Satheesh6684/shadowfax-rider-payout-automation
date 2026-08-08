import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { generateReportSchema, listReportsQuerySchema } from "../validators/report.validators";
import { downloadReport, generateReport, getReportAuditLogs, listReports } from "../controllers/report.controller";

export const reportRouter = Router();

reportRouter.use(requireAuth);

reportRouter.get("/audit-logs", getReportAuditLogs);
reportRouter.get("/", validate(listReportsQuerySchema, "query"), listReports);
reportRouter.post("/generate", requirePermission("reports:generate"), validate(generateReportSchema), generateReport);
reportRouter.get("/:id/download", downloadReport);
