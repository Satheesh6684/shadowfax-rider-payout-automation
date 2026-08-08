import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const UserRepository = {
  async findById(id: string): Promise<UserRow | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async list(
    filters: { role?: string; status?: string; search?: string },
    pagination: PaginationParams
  ): Promise<{ items: UserRow[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.UserWhereInput = {
      ...(filters.role && { role: filters.role }),
      ...(filters.status === "ACTIVE" && { isActive: true }),
      ...(filters.status === "INACTIVE" && { isActive: false }),
      ...(filters.search && {
        OR: [{ name: { contains: filters.search } }, { email: { contains: filters.search } }],
      }),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      prisma.user.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: string;
    mustChangePassword: boolean;
  }): Promise<UserRow> {
    return prisma.user.create({ data });
  },

  async update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<UserRow> {
    return prisma.user.update({ where: { id }, data });
  },

  async recordLogin(entry: {
    userId?: string;
    email: string;
    success: boolean;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.loginHistory.create({ data: entry });
  },

  async getLoginHistory(userId: string, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.loginHistory.findMany({ where, orderBy: { occurredAt: "desc" }, skip, take: pageSize }),
      prisma.loginHistory.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },
};
