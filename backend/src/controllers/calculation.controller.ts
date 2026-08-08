import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { CalculationService } from "../services/calculation.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const runCalculation = asyncHandler(async (req: Request, res: Response) => {
  const { weekStartDate } = req.body as { weekStartDate: string };
  const run = await CalculationService.run(weekStartDate, requireActor(req));
  res.status(201).json({ success: true, data: run });
});

export const getCalculationSummary = asyncHandler(async (req: Request, res: Response) => {
  const weekStartDate = req.query.weekStartDate as string;
  const run = await CalculationService.getLatestSummary(weekStartDate);
  res.json({ success: true, data: run });
});

export const listCalculationRuns = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await CalculationService.listRuns(q.weekStartDate, {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

export const listCalculationResults = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await CalculationService.listResults(
    q.weekStartDate as string,
    { status: q.status, search: q.search },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const getRiderCalculationLogs = asyncHandler(async (req: Request, res: Response) => {
  const weekStartDate = req.query.weekStartDate as string;
  const logs = await CalculationService.getRiderLogs(weekStartDate, req.params.riderId);
  res.json({ success: true, data: logs });
});

export const getCalculationAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await CalculationService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
