import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ValidationService } from "../services/validation.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const runValidation = asyncHandler(async (req: Request, res: Response) => {
  const { weekStartDate } = req.body as { weekStartDate: string };
  const result = await ValidationService.run(weekStartDate, requireActor(req));
  res.status(201).json({ success: true, data: result });
});

export const getValidationSummary = asyncHandler(async (req: Request, res: Response) => {
  const weekStartDate = req.query.weekStartDate as string;
  const result = await ValidationService.getLatestSummary(weekStartDate);
  res.json({ success: true, data: result });
});

export const listValidationIssues = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ValidationService.listIssues(
    req.params.runId,
    { category: q.category, severity: q.severity },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const listValidationRuns = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ValidationService.listRuns(q.weekStartDate, {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

export const getValidationAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ValidationService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
