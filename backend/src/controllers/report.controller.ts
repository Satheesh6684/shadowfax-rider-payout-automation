import { Request, Response } from "express";
import * as fs from "fs";
import { asyncHandler } from "../middleware/errorHandler";
import { ReportService } from "../services/report.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  const { weekStartDate } = req.body as { weekStartDate: string };
  const report = await ReportService.generate(weekStartDate, requireActor(req));
  res.status(201).json({ success: true, data: report });
});

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ReportService.list(
    { weekStartDate: q.weekStartDate, reportType: q.reportType },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const downloadReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await ReportService.getForDownload(req.params.id, requireActor(req));
  res.setHeader("Content-Disposition", `attachment; filename="${report.fileName}"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  fs.createReadStream(report.filePath).pipe(res);
});

export const getReportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await ReportService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
