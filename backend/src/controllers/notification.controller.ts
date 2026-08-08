import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { NotificationService } from "../services/notification.service";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await NotificationService.list(
    { isRead: q.isRead === undefined ? undefined : q.isRead === "true", category: q.category },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const getUnreadCount = asyncHandler(async (_req: Request, res: Response) => {
  const count = await NotificationService.getUnreadCount();
  res.json({ success: true, data: { count } });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await NotificationService.markRead(req.params.id);
  res.json({ success: true, data: notification });
});

export const markAllNotificationsRead = asyncHandler(async (_req: Request, res: Response) => {
  const result = await NotificationService.markAllRead();
  res.json({ success: true, data: result });
});
