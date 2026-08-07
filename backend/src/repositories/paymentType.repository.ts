import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export interface PaymentTypeFilters {
  category?: string;
  status?: string;
  search?: string;
  sortBy?: "name" | "category" | "priority" | "createdAt";
  sortDir?: "asc" | "desc";
}

function buildWhere(filters: PaymentTypeFilters): Prisma.PaymentTypeWhereInput {
  const where: Prisma.PaymentTypeWhereInput = {
    status: filters.status ?? { not: "DELETED" },
  };
  if (filters.category) where.category = filters.category;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }
  return where;
}

function buildOrderBy(filters: PaymentTypeFilters): Prisma.PaymentTypeOrderByWithRelationInput {
  const dir = filters.sortDir ?? "asc";
  switch (filters.sortBy) {
    case "name":
      return { name: dir };
    case "category":
      return { category: dir };
    case "priority":
      return { priority: dir };
    default:
      return { createdAt: dir };
  }
}

export const PaymentTypeRepository = {
  async list(filters: PaymentTypeFilters, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where = buildWhere(filters);

    const [items, total] = await Promise.all([
      prisma.paymentType.findMany({ where, orderBy: buildOrderBy(filters), skip, take: pageSize }),
      prisma.paymentType.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },

  async findById(id: string) {
    return prisma.paymentType.findUnique({ where: { id } });
  },

  async findByName(name: string) {
    return prisma.paymentType.findUnique({ where: { name } });
  },

  async create(data: Prisma.PaymentTypeUncheckedCreateInput) {
    return prisma.paymentType.create({ data });
  },

  async update(id: string, data: Prisma.PaymentTypeUncheckedUpdateInput) {
    return prisma.paymentType.update({ where: { id }, data });
  },

  async recordHistory(entry: {
    paymentTypeId: string;
    version: number;
    changeSummary: string;
    changedBy: string;
    snapshot: Prisma.InputJsonValue;
  }) {
    return prisma.paymentTypeHistory.create({ data: entry });
  },

  async getHistory(paymentTypeId: string) {
    return prisma.paymentTypeHistory.findMany({
      where: { paymentTypeId },
      orderBy: { version: "desc" },
    });
  },

  /** Every ACTIVE payment type — used by the Validation Engine's "Missing
   * Payment Configuration" cross-check and by upload/calculation modules
   * that need the live catalogue, not a paginated page of it. */
  async listActive() {
    return prisma.paymentType.findMany({ where: { status: "ACTIVE" }, orderBy: { priority: "asc" } });
  },
};
