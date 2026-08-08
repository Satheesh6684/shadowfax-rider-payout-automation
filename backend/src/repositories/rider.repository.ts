import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export const RiderRepository = {
  async search(
    filters: { query?: string; weekStartDate?: Date; storeId?: string },
    pagination: PaginationParams
  ) {
    const { page, pageSize, skip } = normalizePagination(pagination);

    const where: Prisma.RiderMasterWhereInput = {
      ...(filters.query && {
        OR: [{ riderId: { contains: filters.query } }, { riderName: { contains: filters.query } }],
      }),
      ...((filters.weekStartDate || filters.storeId) && {
        calculations: {
          some: {
            ...(filters.weekStartDate && { weekStartDate: filters.weekStartDate }),
            ...(filters.storeId && { storeId: filters.storeId }),
          },
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.riderMaster.findMany({ where, orderBy: { riderId: "asc" }, skip, take: pageSize }),
      prisma.riderMaster.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },

  async findByRiderId(riderId: string) {
    return prisma.riderMaster.findUnique({ where: { riderId } });
  },

  async getCalculationHistory(riderId: string, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where = { riderId };
    const [items, total] = await Promise.all([
      prisma.riderCalculation.findMany({ where, orderBy: { weekStartDate: "desc" }, skip, take: pageSize }),
      prisma.riderCalculation.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  async getExceptionHistory(riderId: string, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where = { riderId };
    const [items, total] = await Promise.all([
      prisma.exception.findMany({ where, orderBy: { lastSeenAt: "desc" }, skip, take: pageSize }),
      prisma.exception.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  async getOrdersForWeek(riderId: string, weekStartDate: Date) {
    return prisma.uploadedOrder.findMany({ where: { riderId, weekStartDate }, orderBy: { date: "asc" } });
  },

  async getLoginHoursForWeek(riderId: string, weekStartDate: Date) {
    return prisma.uploadedLoginHours.findMany({ where: { riderId, weekStartDate }, orderBy: { date: "asc" } });
  },

  /** Every distinct week this rider has a calculation for — powers the
   * "Weekly History" list on the rider profile. */
  async getActiveWeeks(riderId: string) {
    const rows = await prisma.riderCalculation.findMany({
      where: { riderId },
      select: { weekStartDate: true },
      orderBy: { weekStartDate: "desc" },
      distinct: ["weekStartDate"],
    });
    return rows.map((r) => r.weekStartDate);
  },
};
