import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export const ReportRepository = {
  async create(data: {
    weekStartDate: Date;
    reportType: string;
    format: string;
    filePath: string;
    fileName: string;
    fileSizeBytes: number;
    generatedBy: string;
  }) {
    return prisma.generatedReport.create({ data });
  },

  async findById(id: string) {
    return prisma.generatedReport.findUnique({ where: { id } });
  },

  async list(filters: { weekStartDate?: Date; reportType?: string }, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.GeneratedReportWhereInput = {
      ...(filters.weekStartDate && { weekStartDate: filters.weekStartDate }),
      ...(filters.reportType && { reportType: filters.reportType }),
    };
    const [items, total] = await Promise.all([
      prisma.generatedReport.findMany({ where, orderBy: { generatedAt: "desc" }, skip, take: pageSize }),
      prisma.generatedReport.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  async recordDownload(id: string) {
    return prisma.generatedReport.update({
      where: { id },
      data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
    });
  },
};
