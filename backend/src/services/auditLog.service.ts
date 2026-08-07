import { prisma } from "../config/prisma";

export interface AuditLogEntry {
  userId?: string;
  module: string; // e.g. "RATE_CARD", "PAYMENT_CONFIG", "UPLOAD_CENTER"
  action: string; // e.g. "STORE_CREATED", "MG_AMOUNT_UPDATED"
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Single write path for audit history across the whole application. Every
 * module (Rate Card, Payment Config, Uploads, Calculation, Reports, ...)
 * should call `AuditLogService.record(...)` instead of writing to the
 * audit_logs table directly — that's what keeps the "User / Module / Date /
 * Time / Old Value / New Value / Action" shape (SRS §13.15, §19) consistent
 * everywhere.
 */
export const AuditLogService = {
  async record(entry: AuditLogEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        module: entry.module,
        action: entry.action,
        oldValue: entry.oldValue as never,
        newValue: entry.newValue as never,
      },
    });
  },

  async search(params: {
    module?: string;
    action?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { module, action, userId, from, to, page = 1, pageSize = 50 } = params;

    const where = {
      ...(module && { module }),
      ...(action && { action }),
      ...(userId && { userId }),
      ...(from || to
        ? {
            occurredAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { entries, total, page, pageSize };
  },
};
