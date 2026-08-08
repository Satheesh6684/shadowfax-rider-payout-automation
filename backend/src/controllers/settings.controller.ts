import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { SettingsService } from "../services/settings.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await SettingsService.get();
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await SettingsService.update(req.body, requireActor(req));
  res.json({ success: true, data: settings });
});

export const getSettingsAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await SettingsService.getAuditLogs({
    action: q.action,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
