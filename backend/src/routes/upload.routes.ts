import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadFileMiddleware } from "../middleware/fileUpload";
import {
  uploadBodySchema,
  uploadHistoryQuerySchema,
  uploadSummaryQuerySchema,
  uploadTypeParamSchema,
} from "../validators/upload.validators";
import {
  getUploadAuditLogs,
  getUploadSummary,
  listUploadHistory,
  removeUpload,
  uploadFile,
} from "../controllers/upload.controller";

export const uploadRouter = Router();

uploadRouter.use(requireAuth);

uploadRouter.get("/summary", validate(uploadSummaryQuerySchema, "query"), getUploadSummary);
uploadRouter.get("/audit-logs", getUploadAuditLogs);
uploadRouter.get("/history", validate(uploadHistoryQuerySchema, "query"), listUploadHistory);
uploadRouter.get(
  "/:type/history",
  validate(uploadTypeParamSchema, "params"),
  validate(uploadHistoryQuerySchema, "query"),
  listUploadHistory
);

uploadRouter.post(
  "/:type",
  requirePermission("upload:write"),
  validate(uploadTypeParamSchema, "params"),
  uploadFileMiddleware,
  validate(uploadBodySchema, "body"),
  uploadFile
);

uploadRouter.delete("/:batchId", requirePermission("upload:write"), removeUpload);
