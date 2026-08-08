import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { UploadService } from "../services/upload.service";
import { UnauthorizedError, ValidationError } from "../utils/AppError";
import type { Actor } from "../types/actor";
import type { UploadType } from "../validators/upload.validators";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const getUploadSummary = asyncHandler(async (req: Request, res: Response) => {
  const weekStartDate = req.query.weekStartDate as string;
  const summary = await UploadService.getSummary(weekStartDate);
  res.json({ success: true, data: summary });
});

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ValidationError("No file was uploaded. Choose a .csv or .xlsx file.");
  }

  const uploadType = req.params.type as UploadType;
  const { weekStartDate, replace } = req.body as { weekStartDate: string; replace?: boolean | string };

  const batch = await UploadService.upload({
    uploadType,
    weekStartDateInput: weekStartDate,
    fileName: req.file.originalname,
    buffer: req.file.buffer,
    sizeBytes: req.file.size,
    replace: replace === true || replace === "true",
    actor: requireActor(req),
  });

  res.status(201).json({ success: true, data: batch });
});

export const listUploadHistory = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await UploadService.listHistory(
    { uploadType: req.params.type as UploadType | undefined, weekStartDate: q.weekStartDate },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const removeUpload = asyncHandler(async (req: Request, res: Response) => {
  const batch = await UploadService.removeBatch(req.params.batchId, requireActor(req));
  res.json({ success: true, data: batch });
});

export const getUploadAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await UploadService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
