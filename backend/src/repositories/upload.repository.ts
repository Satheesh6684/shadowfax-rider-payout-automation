import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { normalizePagination, PaginationParams, toPaginatedResult } from "../utils/pagination";
import { UploadType } from "../validators/upload.validators";

export const UploadRepository = {
  async createBatch(data: {
    uploadType: UploadType;
    fileName: string;
    weekStartDate: Date;
    totalRecords: number;
    status: string;
    uploadedBy: string;
    replacesId?: string;
  }) {
    return prisma.uploadBatch.create({ data });
  },

  async updateBatch(id: string, data: Prisma.UploadBatchUncheckedUpdateInput) {
    return prisma.uploadBatch.update({ where: { id }, data });
  },

  async findBatchById(id: string) {
    return prisma.uploadBatch.findUnique({ where: { id } });
  },

  /** The most recent successful (or still-processing) batch for a type+week —
   * this is "what's currently uploaded" for that upload card. */
  async findCurrentBatch(uploadType: UploadType, weekStartDate: Date) {
    return prisma.uploadBatch.findFirst({
      where: { uploadType, weekStartDate, status: { in: ["SUCCESS", "PROCESSING"] } },
      orderBy: { uploadedAt: "desc" },
    });
  },

  async listHistory(filters: { uploadType?: UploadType; weekStartDate?: Date }, pagination: PaginationParams) {
    const { page, pageSize, skip } = normalizePagination(pagination);
    const where: Prisma.UploadBatchWhereInput = {
      ...(filters.uploadType && { uploadType: filters.uploadType }),
      ...(filters.weekStartDate && { weekStartDate: filters.weekStartDate }),
    };

    const [items, total] = await Promise.all([
      prisma.uploadBatch.findMany({ where, orderBy: { uploadedAt: "desc" }, skip, take: pageSize }),
      prisma.uploadBatch.count({ where }),
    ]);

    return toPaginatedResult(items, total, page, pageSize);
  },

  async insertOrders(rows: Prisma.UploadedOrderCreateManyInput[]) {
    if (rows.length === 0) return { count: 0 };
    return prisma.uploadedOrder.createMany({ data: rows });
  },

  async insertLoginHours(rows: Prisma.UploadedLoginHoursCreateManyInput[]) {
    if (rows.length === 0) return { count: 0 };
    return prisma.uploadedLoginHours.createMany({ data: rows });
  },

  async insertPayments(rows: Prisma.UploadedPaymentCreateManyInput[]) {
    if (rows.length === 0) return { count: 0 };
    return prisma.uploadedPayment.createMany({ data: rows });
  },

  async insertRateCards(rows: Prisma.UploadedRateCardCreateManyInput[]) {
    if (rows.length === 0) return { count: 0 };
    return prisma.uploadedRateCard.createMany({ data: rows });
  },

  async deleteStagedRowsForBatch(uploadType: UploadType, uploadBatchId: string) {
    switch (uploadType) {
      case "ORDERS":
        return prisma.uploadedOrder.deleteMany({ where: { uploadBatchId } });
      case "LOGIN_HOURS":
        return prisma.uploadedLoginHours.deleteMany({ where: { uploadBatchId } });
      case "VALINOR":
        return prisma.uploadedPayment.deleteMany({ where: { uploadBatchId } });
      case "RATE_CARD":
        return prisma.uploadedRateCard.deleteMany({ where: { uploadBatchId } });
    }
  },

  /** Resolves store codes -> Store ids in one query, for rows that reference
   * a store. Codes that don't resolve are simply absent from the returned
   * map — callers store storeId as null for those, letting the (future)
   * Validation Engine flag "Missing Stores" rather than failing the upload. */
  async resolveStoreIdsByCode(storeCodes: string[]): Promise<Map<string, string>> {
    if (storeCodes.length === 0) return new Map();
    const stores = await prisma.store.findMany({
      where: { storeCode: { in: Array.from(new Set(storeCodes)) } },
      select: { id: true, storeCode: true },
    });
    return new Map(stores.map((s) => [s.storeCode, s.id]));
  },

  // ---- Reads used by the Validation Engine — always scoped to one batch ----

  async findOrdersByBatch(uploadBatchId: string) {
    return prisma.uploadedOrder.findMany({ where: { uploadBatchId } });
  },

  async findLoginHoursByBatch(uploadBatchId: string) {
    return prisma.uploadedLoginHours.findMany({ where: { uploadBatchId } });
  },

  async findPaymentsByBatch(uploadBatchId: string) {
    return prisma.uploadedPayment.findMany({ where: { uploadBatchId } });
  },

  async findRateCardsByBatch(uploadBatchId: string) {
    return prisma.uploadedRateCard.findMany({ where: { uploadBatchId } });
  },

  /** Live (already-imported, manually created) rate cards for the week —
   * a store can be "covered" by either this or a staged UploadedRateCard row. */
  async findLiveRateCardsForWeek(weekStartDate: Date) {
    return prisma.weeklyRateCard.findMany({
      where: { weekStartDate, status: { not: "DELETED" } },
      select: { storeId: true, store: { select: { storeCode: true } } },
    });
  },
};
