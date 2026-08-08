import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { UploadRepository } from "../repositories/upload.repository";
import { AuditLogService } from "./auditLog.service";
import { NotificationService } from "./notification.service";
import { assertAllowedFile, assertRequiredColumns, parseUploadFile } from "../utils/fileParser";
import { uploadProcessingQueue } from "../utils/processingQueue";
import { parseWeekStart } from "../utils/week";
import { AppError, ConflictError, NotFoundError, ValidationError } from "../utils/AppError";
import { REQUIRED_COLUMNS, UploadType } from "../validators/upload.validators";
import type { Actor } from "../types/actor";

const MODULE = "UPLOAD_CENTER";

function toOptionalDecimal(raw: string, field: string, rowNum: number): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`Row ${rowNum}: "${field}" must be a number (got "${raw}").`);
  }
  return n;
}

function toRequiredDecimal(raw: string, field: string, rowNum: number): number {
  const n = Number(raw);
  if (raw === "" || !Number.isFinite(n)) {
    throw new ValidationError(`Row ${rowNum}: "${field}" must be a number (got "${raw}").`);
  }
  return n;
}

function toRequiredInt(raw: string, field: string, rowNum: number): number {
  return Math.trunc(toRequiredDecimal(raw, field, rowNum));
}

function toRequiredDate(raw: string, field: string, rowNum: number): Date {
  const date = new Date(raw);
  if (raw === "" || Number.isNaN(date.getTime())) {
    throw new ValidationError(`Row ${rowNum}: "${field}" is not a valid date (got "${raw}").`);
  }
  return date;
}

/** Prisma's unique-constraint error — thrown when a file contains rows that
 * collide with each other (e.g. two rows with the same Order ID) or with
 * already-staged data for that batch. Turned into a clear, honest message
 * rather than a raw DB error. */
function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof PrismaClientKnownRequestError && err.code === "P2002";
}

export const UploadService = {
  async getSummary(weekStartDateInput: string) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    const types: UploadType[] = ["ORDERS", "LOGIN_HOURS", "RATE_CARD", "VALINOR"];
    const batches = await Promise.all(types.map((type) => UploadRepository.findCurrentBatch(type, weekStartDate)));
    return types.reduce<Record<UploadType, unknown>>((acc, type, i) => {
      acc[type] = batches[i];
      return acc;
    }, {} as Record<UploadType, unknown>);
  },

  async listHistory(filters: { uploadType?: UploadType; weekStartDate?: string }, pagination: { page?: number; pageSize?: number }) {
    return UploadRepository.listHistory(
      {
        uploadType: filters.uploadType,
        weekStartDate: filters.weekStartDate ? parseWeekStart(filters.weekStartDate) : undefined,
      },
      pagination
    );
  },

  async upload(params: {
    uploadType: UploadType;
    weekStartDateInput: string;
    fileName: string;
    buffer: Buffer;
    sizeBytes: number;
    replace: boolean;
    actor: Actor;
  }) {
    const { uploadType, fileName, buffer, sizeBytes, replace, actor } = params;
    const weekStartDate = parseWeekStart(params.weekStartDateInput);

    assertAllowedFile(fileName, sizeBytes);

    const existing = await UploadRepository.findCurrentBatch(uploadType, weekStartDate);
    if (existing && !replace) {
      throw new ConflictError(
        `A ${fileName.split(".").pop()?.toUpperCase()} file already exists for this week and upload type. ` +
          "Confirm replacing it, or remove it first.",
        { existingBatchId: existing.id, existingFileName: existing.fileName }
      );
    }

    // Run the whole parse-and-store step through the sequential queue so
    // the server never parses multiple large files at the same instant.
    return uploadProcessingQueue.enqueue(() =>
      this.processUpload({ uploadType, weekStartDate, fileName, buffer, actor, replacesId: existing?.id })
    );
  },

  async processUpload(params: {
    uploadType: UploadType;
    weekStartDate: Date;
    fileName: string;
    buffer: Buffer;
    actor: Actor;
    replacesId?: string;
  }) {
    const { uploadType, weekStartDate, fileName, buffer, actor, replacesId } = params;

    const parsed = parseUploadFile(buffer, fileName);
    assertRequiredColumns(parsed.headers, REQUIRED_COLUMNS[uploadType]);

    const batch = await UploadRepository.createBatch({
      uploadType,
      fileName,
      weekStartDate,
      totalRecords: parsed.rows.length,
      status: "PROCESSING",
      uploadedBy: actor.email,
      replacesId,
    });

    try {
      await this.storeRows(uploadType, batch.id, weekStartDate, parsed.rows);

      if (replacesId) {
        await UploadRepository.updateBatch(replacesId, { status: "REPLACED" });
      }

      const updated = await UploadRepository.updateBatch(batch.id, { status: "SUCCESS" });

      await AuditLogService.record({
        userId: actor.userId,
        module: MODULE,
        action: replacesId ? "UPLOAD_REPLACED" : "UPLOAD_SUCCEEDED",
        newValue: { uploadType, fileName, weekStartDate, totalRecords: parsed.rows.length },
      });

      await NotificationService.create({
        type: "SUCCESS",
        category: "UPLOAD",
        title: `${uploadType} upload succeeded`,
        message: `"${fileName}" (${parsed.rows.length} rows) uploaded for the week of ${weekStartDate.toISOString().slice(0, 10)}.`,
      });

      return updated;
    } catch (err) {
      const message = isUniqueConstraintError(err)
        ? "This file contains duplicate records (same Order ID, or same Rider + Date) that conflict with each other or with already-staged data. Remove duplicates and re-upload."
        : err instanceof AppError
          ? err.message
          : "Unable to process this file. Please verify the format and try again.";

      await UploadRepository.updateBatch(batch.id, { status: "FAILED", errorMessage: message });

      await AuditLogService.record({
        userId: actor.userId,
        module: MODULE,
        action: "UPLOAD_FAILED",
        newValue: { uploadType, fileName, weekStartDate, error: message },
      });

      await NotificationService.create({
        type: "ERROR",
        category: "UPLOAD",
        title: `${uploadType} upload failed`,
        message: `"${fileName}" failed: ${message}`,
      });

      throw new ValidationError(message);
    }
  },

  async storeRows(uploadType: UploadType, batchId: string, weekStartDate: Date, rows: Record<string, string>[]) {
    switch (uploadType) {
      case "ORDERS":
        return this.storeOrders(batchId, weekStartDate, rows);
      case "LOGIN_HOURS":
        return this.storeLoginHours(batchId, weekStartDate, rows);
      case "VALINOR":
        return this.storePayments(batchId, weekStartDate, rows);
      case "RATE_CARD":
        return this.storeRateCards(batchId, weekStartDate, rows);
    }
  },

  async storeOrders(batchId: string, weekStartDate: Date, rows: Record<string, string>[]) {
    const storeMap = await UploadRepository.resolveStoreIdsByCode(rows.map((r) => r["store code"]));

    const data: Prisma.UploadedOrderCreateManyInput[] = rows.map((row, i) => ({
      weekStartDate,
      date: toRequiredDate(row["date"], "Date", i + 2),
      orderId: row["order id"],
      awbNumber: row["awb number"] || null,
      riderId: row["rider id"],
      riderName: row["rider name"] || null,
      storeId: storeMap.get(row["store code"]) ?? null,
      storeCode: row["store code"],
      city: row["city"] || null,
      status: row["status"],
      uploadBatchId: batchId,
    }));

    await UploadRepository.insertOrders(data);
  },

  async storeLoginHours(batchId: string, weekStartDate: Date, rows: Record<string, string>[]) {
    const storeMap = await UploadRepository.resolveStoreIdsByCode(rows.map((r) => r["store code"]));

    const data: Prisma.UploadedLoginHoursCreateManyInput[] = rows.map((row, i) => ({
      weekStartDate,
      date: toRequiredDate(row["date"], "Date", i + 2),
      riderId: row["rider id"],
      riderName: row["rider name"] || null,
      storeId: storeMap.get(row["store code"]) ?? null,
      storeCode: row["store code"] || null,
      loginHours: toRequiredDecimal(row["login hours"], "Login Hours", i + 2),
      uploadBatchId: batchId,
    }));

    await UploadRepository.insertLoginHours(data);
  },

  async storePayments(batchId: string, weekStartDate: Date, rows: Record<string, string>[]) {
    const data: Prisma.UploadedPaymentCreateManyInput[] = rows.map((row, i) => ({
      weekStartDate,
      date: toRequiredDate(row["date"], "Date", i + 2),
      riderId: row["rider id"],
      paymentType: row["payment type"],
      amount: toRequiredDecimal(row["amount"], "Amount", i + 2),
      considered: row["considered"] || null,
      uploadBatchId: batchId,
    }));

    await UploadRepository.insertPayments(data);
  },

  async storeRateCards(batchId: string, weekStartDate: Date, rows: Record<string, string>[]) {
    const data: Prisma.UploadedRateCardCreateManyInput[] = rows.map((row, i) => ({
      weekStartDate,
      storeCode: row["store code"],
      storeName: row["store name"],
      city: row["city"],
      rcType: row["rc type"],
      mgType: row["mg type"],
      minimumOrders: toRequiredInt(row["minimum orders"], "Minimum Orders", i + 2),
      maximumOrders: toRequiredInt(row["maximum orders"], "Maximum Orders", i + 2),
      mgAmount: toRequiredDecimal(row["mg amount"], "MG Amount", i + 2),
      variablePay: toRequiredDecimal(row["variable pay"], "Variable Pay", i + 2),
      weeklyIncentive: toOptionalDecimal(row["weekly incentive"] ?? "", "Weekly Incentive", i + 2),
      orderIncentive: toOptionalDecimal(row["order incentive"] ?? "", "Order Incentive", i + 2),
      uploadBatchId: batchId,
    }));

    await UploadRepository.insertRateCards(data);
  },

  async removeBatch(batchId: string, actor: Actor) {
    const batch = await UploadRepository.findBatchById(batchId);
    if (!batch || batch.status === "REMOVED") {
      throw new NotFoundError("Upload");
    }

    await UploadRepository.deleteStagedRowsForBatch(batch.uploadType as UploadType, batchId);
    const updated = await UploadRepository.updateBatch(batchId, { status: "REMOVED" });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "UPLOAD_REMOVED",
      oldValue: { uploadType: batch.uploadType, fileName: batch.fileName, weekStartDate: batch.weekStartDate },
    });

    return updated;
  },

  async getAuditLogs(params: {
    action?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }) {
    return AuditLogService.search({ ...params, module: MODULE });
  },
};
