import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { ExceptionService } from "../services/exception.service";
import { ValidationService } from "../services/validation.service";
import { CalculationService } from "../services/calculation.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const listExceptions = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ExceptionService.list(
    { weekStartDate: q.weekStartDate, status: q.status, source: q.source, category: q.category, riderId: q.riderId },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const getExceptionSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await ExceptionService.getSummary(req.query.weekStartDate as string);
  res.json({ success: true, data: summary });
});

export const resolveException = asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body as { notes: string };
  const result = await ExceptionService.resolve(req.params.id, notes, requireActor(req));
  res.json({ success: true, data: result });
});

export const ignoreException = asyncHandler(async (req: Request, res: Response) => {
  const { notes } = req.body as { notes: string };
  const result = await ExceptionService.ignore(req.params.id, notes, requireActor(req));
  res.json({ success: true, data: result });
});

export const reopenException = asyncHandler(async (req: Request, res: Response) => {
  const result = await ExceptionService.reopen(req.params.id, requireActor(req));
  res.json({ success: true, data: result });
});

// Reprocessing reuses the existing Validation/Calculation run methods
// directly — no duplicated logic, this is just a convenience entry point
// from the Exception Management screen.
export const reprocessValidation = asyncHandler(async (req: Request, res: Response) => {
  const { weekStartDate } = req.body as { weekStartDate: string };
  const result = await ValidationService.run(weekStartDate, requireActor(req));
  res.status(201).json({ success: true, data: result });
});

export const reprocessCalculation = asyncHandler(async (req: Request, res: Response) => {
  const { weekStartDate } = req.body as { weekStartDate: string };
  const result = await CalculationService.run(weekStartDate, requireActor(req));
  res.status(201).json({ success: true, data: result });
});

export const getExceptionAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ExceptionService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
