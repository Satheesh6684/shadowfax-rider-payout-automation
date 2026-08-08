import { prisma } from "../config/prisma";
import { RateCardFilters, RateCardRepository } from "../repositories/rateCard.repository";
import { PaginationParams } from "../utils/pagination";
import { MasterDataService } from "./masterData.service";
import { AuditLogService } from "./auditLog.service";
import { parseWeekStart, weekEndFromStart } from "../utils/week";
import { ConflictError, NotFoundError, ValidationError } from "../utils/AppError";
import type { Actor } from "../types/actor";
import type { CalculationFieldsInput, CreateRateCardInput, UpdateRateCardInput } from "../validators/rateCard.validators";

const MODULE = "RATE_CARD";

const SLAB_KEYS = ["o1", "o2", "o3", "o4", "o5", "o6", "o7", "mg1", "mg2", "mg3", "mg4", "mg5", "mg6", "mg7", "var1", "var2", "var3", "var4", "var5", "var6", "var7"] as const;

/** Pulls the Calculation Engine fields (Minimum Login Hours, O/MG/Var
 * slabs, weekly F+V config) out of a create/update input, normalizing
 * `undefined` to `null` so Prisma clears a slab the user removed rather
 * than leaving a stale value untouched. */
function calculationFieldsFromInput(input: CalculationFieldsInput) {
  const fields: Record<string, unknown> = {
    minimumLoginHours: input.minimumLoginHours ?? null,
    weeklyPayConfig: input.weeklyPayConfig ?? null,
  };
  for (const key of SLAB_KEYS) {
    fields[key] = input[key] ?? null;
  }
  return fields;
}

/** Strips relations/internal fields so history snapshots and audit diffs stay clean. */
function toSnapshot(rateCard: {
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: unknown;
  variablePay: unknown;
  weeklyIncentive: unknown;
  orderIncentive: unknown;
  status: string;
  version: number;
  minimumLoginHours?: unknown;
  o1?: unknown;
  o2?: unknown;
  o3?: unknown;
  o4?: unknown;
  o5?: unknown;
  o6?: unknown;
  o7?: unknown;
  mg1?: unknown;
  mg2?: unknown;
  mg3?: unknown;
  mg4?: unknown;
  mg5?: unknown;
  mg6?: unknown;
  mg7?: unknown;
  var1?: unknown;
  var2?: unknown;
  var3?: unknown;
  var4?: unknown;
  var5?: unknown;
  var6?: unknown;
  var7?: unknown;
  weeklyPayConfig?: unknown;
}) {
  return {
    rcType: rateCard.rcType,
    mgType: rateCard.mgType,
    minimumOrders: rateCard.minimumOrders,
    maximumOrders: rateCard.maximumOrders,
    mgAmount: rateCard.mgAmount,
    variablePay: rateCard.variablePay,
    weeklyIncentive: rateCard.weeklyIncentive,
    orderIncentive: rateCard.orderIncentive,
    status: rateCard.status,
    version: rateCard.version,
    minimumLoginHours: rateCard.minimumLoginHours ?? null,
    o1: rateCard.o1 ?? null,
    o2: rateCard.o2 ?? null,
    o3: rateCard.o3 ?? null,
    o4: rateCard.o4 ?? null,
    o5: rateCard.o5 ?? null,
    o6: rateCard.o6 ?? null,
    o7: rateCard.o7 ?? null,
    mg1: rateCard.mg1 ?? null,
    mg2: rateCard.mg2 ?? null,
    mg3: rateCard.mg3 ?? null,
    mg4: rateCard.mg4 ?? null,
    mg5: rateCard.mg5 ?? null,
    mg6: rateCard.mg6 ?? null,
    mg7: rateCard.mg7 ?? null,
    var1: rateCard.var1 ?? null,
    var2: rateCard.var2 ?? null,
    var3: rateCard.var3 ?? null,
    var4: rateCard.var4 ?? null,
    var5: rateCard.var5 ?? null,
    var6: rateCard.var6 ?? null,
    var7: rateCard.var7 ?? null,
    weeklyPayConfig: rateCard.weeklyPayConfig ?? null,
  };
}

export const RateCardService = {
  async list(filters: RateCardFilters, pagination: PaginationParams) {
    return RateCardRepository.list(filters, pagination);
  },

  async getByWeek(weekStartDateInput: string) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    return RateCardRepository.listByWeek(weekStartDate);
  },

  async getById(id: string) {
    const rateCard = await RateCardRepository.findById(id);
    if (!rateCard || rateCard.status === "DELETED") {
      throw new NotFoundError("Rate card");
    }
    return rateCard;
  },

  async create(input: CreateRateCardInput, actor: Actor) {
    const weekStartDate = parseWeekStart(input.weekStartDate);
    const weekEndDate = weekEndFromStart(weekStartDate);

    if (await RateCardRepository.isWeekLocked(weekStartDate)) {
      throw new ConflictError("This week is locked. Unlock it before adding rate cards.");
    }

    const store = await MasterDataService.resolveStore({
      cityName: input.cityName,
      storeCode: input.storeCode,
      storeName: input.storeName,
    });

    const existing = await RateCardRepository.findByStoreAndWeek(store.id, weekStartDate);

    if (existing && existing.status !== "DELETED") {
      throw new ConflictError(
        `A rate card for store code "${input.storeCode}" already exists for this week. Edit the existing record instead.`
      );
    }

    const data = {
      rcType: input.rcType,
      mgType: input.mgType,
      minimumOrders: input.minimumOrders,
      maximumOrders: input.maximumOrders,
      mgAmount: input.mgAmount,
      variablePay: input.variablePay,
      weeklyIncentive: input.weeklyIncentive ?? null,
      orderIncentive: input.orderIncentive ?? null,
      status: "ACTIVE",
      version: 1,
      createdBy: actor.email,
      ...calculationFieldsFromInput(input),
    };

    const rateCard = existing
      ? await RateCardRepository.update(existing.id, { ...data, weekStartDate, weekEndDate, storeId: store.id })
      : await RateCardRepository.create({ ...data, weekStartDate, weekEndDate, storeId: store.id });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: existing ? "RATE_CARD_RECREATED" : "RATE_CARD_CREATED",
      newValue: toSnapshot(rateCard),
    });

    return rateCard;
  },

  async update(id: string, input: UpdateRateCardInput, actor: Actor) {
    const existing = await RateCardRepository.findById(id);
    if (!existing || existing.status === "DELETED") {
      throw new NotFoundError("Rate card");
    }
    if (existing.status === "LOCKED") {
      throw new ConflictError("This rate card's week is locked and cannot be edited.");
    }

    // Store the PRE-edit values before they're overwritten, tagged with the
    // version they represented — this is what "view old versions" reads from.
    await RateCardRepository.recordHistory({
      rateCardId: id,
      version: existing.version,
      changeSummary: input.changeSummary,
      changedBy: actor.email,
      snapshot: toSnapshot(existing),
    });

    const updated = await RateCardRepository.update(id, {
      rcType: input.rcType,
      mgType: input.mgType,
      minimumOrders: input.minimumOrders,
      maximumOrders: input.maximumOrders,
      mgAmount: input.mgAmount,
      variablePay: input.variablePay,
      weeklyIncentive: input.weeklyIncentive ?? null,
      orderIncentive: input.orderIncentive ?? null,
      version: existing.version + 1,
      ...calculationFieldsFromInput(input),
    });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "RATE_CARD_UPDATED",
      oldValue: toSnapshot(existing),
      newValue: toSnapshot(updated),
    });

    return updated;
  },

  async delete(id: string, actor: Actor) {
    const existing = await RateCardRepository.findById(id);
    if (!existing || existing.status === "DELETED") {
      throw new NotFoundError("Rate card");
    }
    if (existing.status === "LOCKED") {
      throw new ConflictError("This rate card's week is locked and cannot be deleted.");
    }

    await RateCardRepository.recordHistory({
      rateCardId: id,
      version: existing.version,
      changeSummary: "Deleted",
      changedBy: actor.email,
      snapshot: toSnapshot(existing),
    });

    await RateCardRepository.update(id, { status: "DELETED" });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "RATE_CARD_DELETED",
      oldValue: toSnapshot(existing),
    });

    return { success: true as const };
  },

  async copyPreviousWeek(sourceWeekInput: string, targetWeekInput: string, actor: Actor) {
    const sourceWeekStartDate = parseWeekStart(sourceWeekInput);
    const targetWeekStartDate = parseWeekStart(targetWeekInput);

    if (sourceWeekStartDate.getTime() === targetWeekStartDate.getTime()) {
      throw new ValidationError("Source and target week must be different.");
    }

    const sourceRows = await RateCardRepository.listByWeek(sourceWeekStartDate);
    if (sourceRows.length === 0) {
      throw new ValidationError("The selected source week has no rate cards to copy.");
    }

    const targetRows = await RateCardRepository.listByWeek(targetWeekStartDate);
    if (targetRows.length > 0) {
      throw new ConflictError(
        "The target week already has rate cards. Copy into an empty week, or remove existing records first."
      );
    }

    const targetWeekEndDate = weekEndFromStart(targetWeekStartDate);

    const created = await prisma.$transaction(
      sourceRows.map((row) =>
        prisma.weeklyRateCard.create({
          data: {
            weekStartDate: targetWeekStartDate,
            weekEndDate: targetWeekEndDate,
            storeId: row.storeId,
            rcType: row.rcType,
            mgType: row.mgType,
            minimumOrders: row.minimumOrders,
            maximumOrders: row.maximumOrders,
            mgAmount: row.mgAmount,
            variablePay: row.variablePay,
            weeklyIncentive: row.weeklyIncentive,
            orderIncentive: row.orderIncentive,
            status: "ACTIVE",
            version: 1,
            createdBy: actor.email,
          },
        })
      )
    );

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "RATE_CARD_WEEK_COPIED",
      oldValue: { sourceWeekStartDate },
      newValue: { targetWeekStartDate, recordsCopied: created.length },
    });

    return { recordsCopied: created.length, targetWeekStartDate };
  },

  async lockWeek(weekInput: string, actor: Actor) {
    const weekStartDate = parseWeekStart(weekInput);

    const rows = await RateCardRepository.listByWeek(weekStartDate);
    if (rows.length === 0) {
      throw new ValidationError("No rate cards exist for this week yet.");
    }
    if (await RateCardRepository.isWeekLocked(weekStartDate)) {
      throw new ConflictError("This week is already locked.");
    }

    const result = await RateCardRepository.setStatusForWeek(weekStartDate, "LOCKED");

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "RATE_CARD_WEEK_LOCKED",
      newValue: { weekStartDate, lockedBy: actor.email, recordCount: result.count },
    });

    return { success: true as const, recordsLocked: result.count };
  },

  async getVersionHistory(id: string) {
    const rateCard = await RateCardRepository.findById(id);
    if (!rateCard) {
      throw new NotFoundError("Rate card");
    }
    return RateCardRepository.getHistory(id);
  },

  async getRecentHistory(weekStartDateInput: string, limit = 10) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    return RateCardRepository.getRecentHistoryForWeek(weekStartDate, limit);
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
