import { randomUUID } from "crypto";
import { UploadRepository } from "../repositories/upload.repository";
import { RateCardRepository } from "../repositories/rateCard.repository";
import { RiderMasterRepository } from "../repositories/riderMaster.repository";
import { CalculationRepository } from "../repositories/calculation.repository";
import { ExceptionRepository } from "../repositories/exception.repository";
import { ValidationService } from "./validation.service";
import { AuditLogService } from "./auditLog.service";
import { NotificationService } from "./notification.service";
import { parseWeekStart } from "../utils/week";
import { roundCurrency } from "../utils/roundOff";
import { ConflictError, NotFoundError } from "../utils/AppError";
import { PAYOUT_STRATEGIES } from "./calculation/strategies";
import { mapLiveRateCard, mapStagedRateCard } from "./calculation/rateCardMapper";
import { DailyStoreGroup, ResolvedRateCard, RiderWeekContext, StrategyResult } from "./calculation/types";
import type { Actor } from "../types/actor";
import type { UploadType } from "../validators/upload.validators";

const MODULE = "CALCULATION_ENGINE";

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const CalculationService = {
  async run(weekStartDateInput: string, actor: Actor) {
    const weekStartDate = parseWeekStart(weekStartDateInput);

    const { canRunCalculation } = await ValidationService.getLatestSummary(weekStartDateInput);
    if (!canRunCalculation) {
      throw new ConflictError("Validation must pass (or pass with warnings only) before running calculation.");
    }

    const types: UploadType[] = ["ORDERS", "LOGIN_HOURS", "RATE_CARD", "VALINOR"];
    const [ordersBatch, loginBatch, rateCardBatch, valinorBatch] = await Promise.all(
      types.map((t) => UploadRepository.findCurrentBatch(t, weekStartDate))
    );

    const [orders, loginHours, stagedRateCards, payments] = await Promise.all([
      ordersBatch?.status === "SUCCESS" ? UploadRepository.findOrdersByBatch(ordersBatch.id) : Promise.resolve([]),
      loginBatch?.status === "SUCCESS" ? UploadRepository.findLoginHoursByBatch(loginBatch.id) : Promise.resolve([]),
      rateCardBatch?.status === "SUCCESS"
        ? UploadRepository.findRateCardsByBatch(rateCardBatch.id)
        : Promise.resolve([]),
      valinorBatch?.status === "SUCCESS" ? UploadRepository.findPaymentsByBatch(valinorBatch.id) : Promise.resolve([]),
    ]);

    // Rate Card Resolution — live (manually managed) rate cards take
    // precedence over a staged bulk-upload for the same store, since only
    // live cards support MG/Variable/F+V slab configuration.
    const liveRateCards = await RateCardRepository.listByWeek(weekStartDate);
    const rateCardByStoreCode = new Map<string, ResolvedRateCard>();
    for (const rc of stagedRateCards) {
      rateCardByStoreCode.set(rc.storeCode, mapStagedRateCard(rc));
    }
    for (const rc of liveRateCards) {
      rateCardByStoreCode.set(rc.store.storeCode, mapLiveRateCard(rc));
    }

    const riderIds = new Set<string>([...orders.map((o) => o.riderId), ...loginHours.map((l) => l.riderId)]);

    const riderNames = new Map<string, string | null>();
    for (const row of loginHours) if (row.riderName) riderNames.set(row.riderId, row.riderName);
    for (const row of orders) if (row.riderName && !riderNames.has(row.riderId)) riderNames.set(row.riderId, row.riderName);

    await RiderMasterRepository.findOrCreateMany(
      Array.from(riderIds).map((riderId) => ({ riderId, riderName: riderNames.get(riderId) ?? null }))
    );

    const allStoreCodes = new Set<string>([
      ...orders.map((o) => o.storeCode),
      ...(loginHours.map((l) => l.storeCode).filter(Boolean) as string[]),
    ]);
    const storeIdByCode = await UploadRepository.resolveStoreIdsByCode(Array.from(allStoreCodes));

    const runId = randomUUID();
    let totalCalculated = 0;
    let totalExceptions = 0;
    const allLogs: {
      calculationRunId: string;
      weekStartDate: Date;
      riderId: string;
      strategyName: string;
      status: string;
      amount: number | null;
      message: string;
    }[] = [];

    for (const riderId of riderIds) {
      const riderOrders = orders.filter((o) => o.riderId === riderId);
      const riderLogins = loginHours.filter((l) => l.riderId === riderId);
      const riderPayments = payments.filter((p) => p.riderId === riderId);

      // ---- Build (date, store) groups — business rules §6 daily grouping ----
      const groupKeys = new Set<string>();
      const dateForKey = new Map<string, Date>();
      const storeForKey = new Map<string, string>();
      for (const o of riderOrders) {
        const key = `${dateKey(o.date)}__${o.storeCode}`;
        groupKeys.add(key);
        dateForKey.set(key, o.date);
        storeForKey.set(key, o.storeCode);
      }
      for (const l of riderLogins) {
        if (!l.storeCode) continue;
        const key = `${dateKey(l.date)}__${l.storeCode}`;
        groupKeys.add(key);
        dateForKey.set(key, l.date);
        storeForKey.set(key, l.storeCode);
      }

      const dailyGroups: DailyStoreGroup[] = Array.from(groupKeys).map((key) => {
        const date = dateForKey.get(key)!;
        const storeCode = storeForKey.get(key)!;
        const completedOrders = riderOrders.filter((o) => o.storeCode === storeCode && dateKey(o.date) === dateKey(date)).length;
        const loginHoursSum = riderLogins
          .filter((l) => l.storeCode === storeCode && dateKey(l.date) === dateKey(date))
          .reduce((sum, l) => sum + Number(l.loginHours), 0);
        return {
          date,
          storeCode,
          storeId: storeIdByCode.get(storeCode) ?? null,
          completedOrders,
          loginHours: loginHoursSum,
          rateCard: rateCardByStoreCode.get(storeCode) ?? null,
        };
      });

      const totalWeeklyOrders = riderOrders.length;
      const primaryStoreCode = mostFrequent(riderOrders.map((o) => o.storeCode)) ?? mostFrequent(riderLogins.map((l) => l.storeCode ?? "").filter(Boolean));
      const primaryStoreId = primaryStoreCode ? (storeIdByCode.get(primaryStoreCode) ?? null) : null;
      const primaryRateCard = primaryStoreCode ? (rateCardByStoreCode.get(primaryStoreCode) ?? null) : null;

      const valinorAddedByCategory: Record<string, number> = {};
      for (const p of riderPayments) {
        valinorAddedByCategory[p.paymentType] = (valinorAddedByCategory[p.paymentType] ?? 0) + Number(p.amount);
      }
      const valinorAddedTotal = Object.values(valinorAddedByCategory).reduce((sum, v) => sum + v, 0);

      const context: RiderWeekContext = {
        riderId,
        weekStartDate,
        dailyGroups,
        totalWeeklyOrders,
        primaryStoreId,
        primaryStoreCode,
        primaryRateCard,
        valinorAddedByCategory,
        valinorAddedTotal,
      };

      const strategyResults: { name: string; result: StrategyResult }[] = PAYOUT_STRATEGIES.map((strategy) => ({
        name: strategy.name,
        result: strategy.run(context),
      }));

      for (const { name, result } of strategyResults) {
        allLogs.push({
          calculationRunId: runId,
          weekStartDate,
          riderId,
          strategyName: name,
          status: result.status,
          amount: result.amount,
          message: result.message,
        });
      }

      const hasException = strategyResults.some((s) => s.result.status === "EXCEPTION");
      const actualAmount = roundCurrency(valinorAddedTotal);

      allLogs.push({
        calculationRunId: runId,
        weekStartDate,
        riderId,
        strategyName: "VALINOR_MERGE",
        status: "CALCULATED",
        amount: actualAmount,
        message: `Merged ${riderPayments.length} Valinor record(s) across ${Object.keys(valinorAddedByCategory).length} payment type(s).`,
      });

      let totalEligibleAmount: number | null = null;
      let pendingAmount: number | null = null;
      let status: string;
      let remarks: string;

      if (hasException) {
        status = "EXCEPTION";
        remarks = strategyResults
          .filter((s) => s.result.status === "EXCEPTION")
          .map((s) => s.result.message)
          .join(" ");
        totalExceptions += 1;

        // Feed the Exception Management ledger — one ticket per failing
        // strategy, so "MG has no slabs configured" and "F+V has no weekly
        // config" for the same rider are independently resolvable, not
        // bundled into one vague ticket.
        await Promise.all(
          strategyResults
            .filter((s) => s.result.status === "EXCEPTION")
            .map((s) =>
              ExceptionRepository.upsert({
                weekStartDate,
                source: "CALCULATION",
                category: "CALCULATION",
                checkName: s.name,
                severity: "ERROR",
                riderId,
                message: s.result.message,
                sourceRunId: runId,
              })
            )
        );
      } else {
        // Arrears — business rules §7: Eligible Amount − Already Paid Amount.
        totalEligibleAmount = roundCurrency(strategyResults.reduce((sum, s) => sum + (s.result.amount ?? 0), 0));
        pendingAmount = roundCurrency(totalEligibleAmount - actualAmount);
        status = "CALCULATED";
        remarks = strategyResults.map((s) => s.result.message).join(" ");
        totalCalculated += 1;
      }

      await CalculationRepository.upsertRiderCalculation({
        riderId,
        weekStartDate,
        storeId: primaryStoreId,
        totalEligibleAmount,
        actualAmount,
        pendingAmount,
        status,
        remarks,
      });
    }

    await CalculationRepository.createLogs(allLogs);

    const finalStatus = riderIds.size === 0 ? "FAILED" : totalExceptions > 0 ? "COMPLETED_WITH_EXCEPTIONS" : "COMPLETED";

    const run = await CalculationRepository.createRunWithId(runId, {
      weekStartDate,
      status: finalStatus,
      totalRiders: riderIds.size,
      totalCalculated,
      totalExceptions,
      runBy: actor.email,
    });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "CALCULATION_RUN_COMPLETED",
      newValue: { weekStartDate, status: finalStatus, totalRiders: riderIds.size, totalCalculated, totalExceptions },
    });

    await NotificationService.create({
      type: totalExceptions > 0 ? "ERROR" : "SUCCESS",
      category: "CALCULATION",
      title: `Calculation ${finalStatus === "COMPLETED" ? "completed" : finalStatus.toLowerCase().replace(/_/g, " ")}`,
      message: `${totalCalculated} rider(s) calculated, ${totalExceptions} exception(s), for the week of ${weekStartDate.toISOString().slice(0, 10)}.`,
    });

    return run;
  },

  async getLatestSummary(weekStartDateInput: string) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    return CalculationRepository.findLatestRun(weekStartDate);
  },

  async listRuns(weekStartDateInput: string | undefined, pagination: { page?: number; pageSize?: number }) {
    return CalculationRepository.listRuns(weekStartDateInput ? parseWeekStart(weekStartDateInput) : undefined, pagination);
  },

  async listResults(
    weekStartDateInput: string,
    filters: { status?: string; search?: string },
    pagination: { page?: number; pageSize?: number }
  ) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    return CalculationRepository.listResults(weekStartDate, filters, pagination);
  },

  async getRiderLogs(weekStartDateInput: string, riderId: string) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    const logs = await CalculationRepository.listLogsForRider(weekStartDate, riderId);
    if (logs.length === 0) throw new NotFoundError("Calculation logs for this rider/week");
    return logs;
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
