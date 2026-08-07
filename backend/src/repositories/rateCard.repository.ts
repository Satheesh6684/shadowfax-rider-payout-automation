import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export interface RateCardFilters {
  weekStartDate?: Date;
  city?: string;
  storeCode?: string;
  rcType?: string;
  status?: string;
  search?: string;
  sortBy?: "storeName" | "storeCode" | "city" | "mgAmount" | "variablePay" | "createdAt";
  sortDir?: "asc" | "desc";
}

const WITH_STORE = { store: { include: { city: true } } } as const;

function buildWhere(filters: RateCardFilters): Prisma.WeeklyRateCardWhereInput {
  const where: Prisma.WeeklyRateCardWhereInput = {
    // DELETED rows are excluded from every normal view — they only surface
    // through history/audit trails, never the working table.
    status: filters.status ?? { not: "DELETED" },
  };

  if (filters.weekStartDate) where.weekStartDate = filters.weekStartDate;
  if (filters.rcType) where.rcType = filters.rcType;
  if (filters.storeCode) where.store = { storeCode: filters.storeCode };
  if (filters.city) where.store = { ...where.store, city: { name: filters.city } };

  if (filters.search) {
    where.OR = [
      { store: { storeName: { contains: filters.search } } },
      { store: { storeCode: { contains: filters.search } } },
      { store: { city: { name: { contains: filters.search } } } },
      { rcType: { contains: filters.search } },
    ];
  }

  return where;
}

function buildOrderBy(filters: RateCardFilters): Prisma.WeeklyRateCardOrderByWithRelationInput {
  const dir = filters.sortDir ?? "asc";
  switch (filters.sortBy) {
    case "storeName":
      return { store: { storeName: dir } };
    case "storeCode":
      return { store: { storeCode: dir } };
    case "city":
      return { store: { city: { name: dir } } };
    case "mgAmount":
      return { mgAmount: dir };
    case "variablePay":
      return { variablePay: dir };
    default:
      return { createdAt: dir };
  }
}

export const RateCardRepository = {
  async list(filters: RateCardFilters, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where = buildWhere(filters);

    const [items, total] = await Promise.all([
      prisma.weeklyRateCard.findMany({
        where,
        include: WITH_STORE,
        orderBy: buildOrderBy(filters),
        skip,
        take: pageSize,
      }),
      prisma.weeklyRateCard.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },

  async listByWeek(weekStartDate: Date) {
    return prisma.weeklyRateCard.findMany({
      where: { weekStartDate, status: { not: "DELETED" } },
      include: WITH_STORE,
      orderBy: { store: { storeName: "asc" } },
    });
  },

  async findById(id: string) {
    return prisma.weeklyRateCard.findUnique({ where: { id }, include: WITH_STORE });
  },

  async findByStoreAndWeek(storeId: string, weekStartDate: Date) {
    return prisma.weeklyRateCard.findUnique({
      where: { storeId_weekStartDate: { storeId, weekStartDate } },
    });
  },

  async create(data: Prisma.WeeklyRateCardUncheckedCreateInput) {
    return prisma.weeklyRateCard.create({ data, include: WITH_STORE });
  },

  async update(id: string, data: Prisma.WeeklyRateCardUncheckedUpdateInput) {
    return prisma.weeklyRateCard.update({ where: { id }, data, include: WITH_STORE });
  },

  /**
   * There's no separate "week" entity — a week is considered locked once any
   * of its rows carry status LOCKED, since Lock Week always locks every row
   * for that week together (see setStatusForWeek).
   */
  async isWeekLocked(weekStartDate: Date) {
    const count = await prisma.weeklyRateCard.count({ where: { weekStartDate, status: "LOCKED" } });
    return count > 0;
  },

  async setStatusForWeek(weekStartDate: Date, status: string) {
    return prisma.weeklyRateCard.updateMany({
      where: { weekStartDate, status: { not: "DELETED" } },
      data: { status },
    });
  },

  async recordHistory(entry: {
    rateCardId: string;
    version: number;
    changeSummary: string;
    changedBy: string;
    snapshot: Prisma.InputJsonValue;
  }) {
    return prisma.rateCardHistory.create({ data: entry });
  },

  async getHistory(rateCardId: string) {
    return prisma.rateCardHistory.findMany({
      where: { rateCardId },
      orderBy: { version: "desc" },
    });
  },
};
