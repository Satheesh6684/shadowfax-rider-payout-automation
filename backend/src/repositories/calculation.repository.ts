import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";

export const CalculationRepository = {
  async createRun(data: {
    weekStartDate: Date;
    status: string;
    totalRiders: number;
    totalCalculated: number;
    totalExceptions: number;
    runBy: string;
  }) {
    return prisma.calculationRun.create({ data });
  },

  /** Same as createRun, but with a caller-supplied id — used when logs
   * created during the run need a stable calculationRunId to reference
   * before the run's final counts are known. */
  async createRunWithId(
    id: string,
    data: {
      weekStartDate: Date;
      status: string;
      totalRiders: number;
      totalCalculated: number;
      totalExceptions: number;
      runBy: string;
    }
  ) {
    return prisma.calculationRun.create({ data: { id, ...data } });
  },

  async findLatestRun(weekStartDate: Date) {
    return prisma.calculationRun.findFirst({ where: { weekStartDate }, orderBy: { runAt: "desc" } });
  },

  async listRuns(weekStartDate: Date | undefined, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.CalculationRunWhereInput = weekStartDate ? { weekStartDate } : {};
    const [items, total] = await Promise.all([
      prisma.calculationRun.findMany({ where, orderBy: { runAt: "desc" }, skip, take: pageSize }),
      prisma.calculationRun.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  async createLogs(logs: Prisma.CalculationLogCreateManyInput[]) {
    if (logs.length === 0) return { count: 0 };
    return prisma.calculationLog.createMany({ data: logs });
  },

  async listLogsForRider(weekStartDate: Date, riderId: string) {
    return prisma.calculationLog.findMany({
      where: { weekStartDate, riderId },
      orderBy: { createdAt: "asc" },
    });
  },

  /** Upsert since re-running calculation for an already-calculated
   * rider+week updates that rider's result rather than creating a
   * duplicate — RiderCalculation represents current state, not history;
   * CalculationRun + CalculationLog are what preserve run-by-run history. */
  async upsertRiderCalculation(data: {
    riderId: string;
    weekStartDate: Date;
    storeId: string | null;
    totalEligibleAmount: number | null;
    actualAmount: number | null;
    pendingAmount: number | null;
    status: string;
    remarks: string;
  }) {
    return prisma.riderCalculation.upsert({
      where: { riderId_weekStartDate: { riderId: data.riderId, weekStartDate: data.weekStartDate } },
      create: { ...data, calculatedAt: new Date() },
      update: { ...data, calculatedAt: new Date() },
    });
  },

  async listResults(weekStartDate: Date, filters: { status?: string; search?: string }, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.RiderCalculationWhereInput = {
      weekStartDate,
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { riderId: { contains: filters.search } }),
    };
    const [items, total] = await Promise.all([
      prisma.riderCalculation.findMany({ where, orderBy: { riderId: "asc" }, skip, take: pageSize }),
      prisma.riderCalculation.count({ where }),
    ]);
    return toPaginatedResult(items, total, page, pageSize);
  },

  /** Every RiderCalculation row for a week, unpaginated — Report
   * Generation needs the complete set, not one page of it. */
  async listAllResultsForWeek(weekStartDate: Date) {
    return prisma.riderCalculation.findMany({ where: { weekStartDate }, orderBy: { riderId: "asc" } });
  },

  /** Every CalculationLog row for a week across all riders — used to build
   * the per-strategy report sheets (MG, Variable, F+V family). */
  async listAllLogsForWeek(weekStartDate: Date) {
    return prisma.calculationLog.findMany({ where: { weekStartDate }, orderBy: [{ riderId: "asc" }, { strategyName: "asc" }] });
  },
};
