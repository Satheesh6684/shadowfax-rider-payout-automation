import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export type NotificationType = "SUCCESS" | "ERROR" | "INFO";
export type NotificationCategory = "UPLOAD" | "VALIDATION" | "CALCULATION" | "REPORT";

/**
 * The persisted notification center (the bell icon's contents) — a
 * single write path, same pattern as AuditLogService, so any module can
 * call NotificationService.create(...) without knowing anything about how
 * notifications are stored or displayed. Distinct from Toast, which stays
 * exactly as-is for in-session real-time feedback.
 */
export const NotificationService = {
  async create(entry: {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    userId?: string;
    context?: Record<string, unknown>;
  }) {
    return prisma.notification.create({
      data: {
        type: entry.type,
        category: entry.category,
        title: entry.title,
        message: entry.message,
        userId: entry.userId ?? null,
        context: (entry.context ?? null) as never,
      },
    });
  },

  async list(filters: { isRead?: boolean; category?: string }, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where = {
      ...(filters.isRead !== undefined && { isRead: filters.isRead }),
      ...(filters.category && { category: filters.category }),
    };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      prisma.notification.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  async getUnreadCount() {
    return prisma.notification.count({ where: { isRead: false } });
  },

  async markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  },

  async markAllRead() {
    return prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true, readAt: new Date() } });
  },
};
