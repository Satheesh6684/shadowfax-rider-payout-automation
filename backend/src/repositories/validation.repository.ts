import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";
import { RawIssue } from "../services/validation/types";

export const ValidationRepository = {
  async createRun(data: {
    weekStartDate: Date;
    status: string;
    totalErrors: number;
    totalWarnings: number;
    runBy: string;
  }) {
    return prisma.validationRun.create({ data });
  },

  async createIssues(validationRunId: string, weekStartDate: Date, issues: RawIssue[]) {
    if (issues.length === 0) return { count: 0 };
    return prisma.validationIssue.createMany({
      data: issues.map((i) => ({
        validationRunId,
        weekStartDate,
        category: i.category,
        checkName: i.checkName,
        severity: i.severity,
        message: i.message,
        context: (i.context ?? {}) as Prisma.InputJsonValue,
      })),
    });
  },

  async findLatestRun(weekStartDate: Date) {
    return prisma.validationRun.findFirst({
      where: { weekStartDate },
      orderBy: { runAt: "desc" },
    });
  },

  /** Every issue for a run, unpaginated — used by Report Generation's
   * Validation Errors / Missing Stores sheets. */
  async listAllIssuesForRun(validationRunId: string) {
    return prisma.validationIssue.findMany({
      where: { validationRunId },
      orderBy: [{ severity: "asc" }, { category: "asc" }],
    });
  },

  async findRunById(id: string) {
    return prisma.validationRun.findUnique({ where: { id } });
  },

  async listIssues(
    filters: { validationRunId: string; category?: string; severity?: string },
    pagination: PaginationParams
  ) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.ValidationIssueWhereInput = {
      validationRunId: filters.validationRunId,
      ...(filters.category && { category: filters.category }),
      ...(filters.severity && { severity: filters.severity }),
    };

    const [items, total] = await Promise.all([
      prisma.validationIssue.findMany({ where, orderBy: [{ severity: "asc" }, { category: "asc" }], skip, take: pageSize }),
      prisma.validationIssue.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },

  async listRuns(weekStartDate: Date | undefined, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.ValidationRunWhereInput = weekStartDate ? { weekStartDate } : {};

    const [items, total] = await Promise.all([
      prisma.validationRun.findMany({ where, orderBy: { runAt: "desc" }, skip, take: pageSize }),
      prisma.validationRun.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },
};
