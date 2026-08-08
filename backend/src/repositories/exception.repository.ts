import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export interface UpsertExceptionInput {
  weekStartDate: Date;
  source: "VALIDATION" | "CALCULATION";
  category: string;
  checkName: string;
  severity: "ERROR" | "WARNING";
  riderId?: string | null;
  message: string;
  context?: Prisma.InputJsonValue;
  sourceRunId: string;
}

export const ExceptionRepository = {
  /** Upserts one exception ticket. A recurrence of the same (week, source,
   * category, checkName, rider) bumps occurrenceCount/lastSeenAt and
   * re-opens it if it had been marked RESOLVED — a "resolved" issue that
   * comes back on the next run genuinely isn't resolved. IGNORED tickets
   * stay ignored on recurrence (that's a deliberate "not an issue" call,
   * not something a re-run should silently undo). */
  async upsert(input: UpsertExceptionInput) {
    const dedupeKey = input.riderId ?? "GLOBAL";
    const where = {
      weekStartDate_source_category_checkName_dedupeKey: {
        weekStartDate: input.weekStartDate,
        source: input.source,
        category: input.category,
        checkName: input.checkName,
        dedupeKey,
      },
    };

    const existing = await prisma.exception.findUnique({ where });

    if (!existing) {
      return prisma.exception.create({
        data: {
          weekStartDate: input.weekStartDate,
          source: input.source,
          category: input.category,
          checkName: input.checkName,
          severity: input.severity,
          riderId: input.riderId ?? null,
          dedupeKey,
          message: input.message,
          context: input.context ?? null,
          sourceRunId: input.sourceRunId,
        },
      });
    }

    return prisma.exception.update({
      where,
      data: {
        message: input.message,
        context: input.context ?? null,
        sourceRunId: input.sourceRunId,
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeenAt: new Date(),
        status: existing.status === "IGNORED" ? "IGNORED" : "OPEN",
      },
    });
  },

  async list(
    filters: { weekStartDate?: Date; status?: string; source?: string; category?: string; riderId?: string },
    pagination: PaginationParams
  ) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.ExceptionWhereInput = {
      ...(filters.weekStartDate && { weekStartDate: filters.weekStartDate }),
      ...(filters.status && { status: filters.status }),
      ...(filters.source && { source: filters.source }),
      ...(filters.category && { category: filters.category }),
      ...(filters.riderId && { riderId: filters.riderId }),
    };

    const [items, total] = await Promise.all([
      prisma.exception.findMany({
        where,
        orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.exception.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },

  async getSummary(weekStartDate: Date) {
    const [open, resolved, ignored, bySource] = await Promise.all([
      prisma.exception.count({ where: { weekStartDate, status: "OPEN" } }),
      prisma.exception.count({ where: { weekStartDate, status: "RESOLVED" } }),
      prisma.exception.count({ where: { weekStartDate, status: "IGNORED" } }),
      prisma.exception.groupBy({
        by: ["source"],
        where: { weekStartDate, status: "OPEN" },
        _count: { _all: true },
      }),
    ]);

    return {
      open,
      resolved,
      ignored,
      openBySource: Object.fromEntries(bySource.map((s) => [s.source, s._count._all])),
    };
  },

  async findById(id: string) {
    return prisma.exception.findUnique({ where: { id } });
  },

  /** Every exception for a week, unpaginated — Report Generation's
   * Exceptions sheet needs the complete set. */
  async listAllForWeek(weekStartDate: Date) {
    return prisma.exception.findMany({ where: { weekStartDate }, orderBy: [{ status: "asc" }, { source: "asc" }] });
  },

  async resolve(id: string, resolvedBy: string, notes: string) {
    return prisma.exception.update({
      where: { id },
      data: { status: "RESOLVED", resolvedBy, resolvedAt: new Date(), resolutionNotes: notes },
    });
  },

  async ignore(id: string, resolvedBy: string, notes: string) {
    return prisma.exception.update({
      where: { id },
      data: { status: "IGNORED", resolvedBy, resolvedAt: new Date(), resolutionNotes: notes },
    });
  },

  async reopen(id: string) {
    return prisma.exception.update({
      where: { id },
      data: { status: "OPEN", resolvedBy: null, resolvedAt: null, resolutionNotes: null },
    });
  },
};
