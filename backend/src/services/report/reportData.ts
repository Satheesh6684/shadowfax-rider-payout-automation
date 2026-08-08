import { CalculationRepository } from "../../repositories/calculation.repository";
import { ValidationRepository } from "../../repositories/validation.repository";
import { ExceptionRepository } from "../../repositories/exception.repository";
import { RateCardRepository } from "../../repositories/rateCard.repository";
import { StoreRepository } from "../../repositories/store.repository";
import { AuditLogService } from "../auditLog.service";
import { weekEndFromStart } from "../../utils/week";

interface StoreLookup {
  storeCode: string;
  storeName: string;
}

/**
 * Gathers every sheet's raw data for a week in one place, reusing existing
 * repositories throughout — no new queries duplicate logic that already
 * exists elsewhere in the app. Excel formatting lives in excelBuilder.ts;
 * this module only fetches and joins.
 */
export async function gatherReportData(weekStartDate: Date) {
  const weekEndDate = weekEndFromStart(weekStartDate);

  const [results, logs, latestValidationRun, exceptions, rateCards] = await Promise.all([
    CalculationRepository.listAllResultsForWeek(weekStartDate),
    CalculationRepository.listAllLogsForWeek(weekStartDate),
    ValidationRepository.findLatestRun(weekStartDate),
    ExceptionRepository.listAllForWeek(weekStartDate),
    RateCardRepository.listByWeek(weekStartDate),
  ]);

  const validationIssues = latestValidationRun
    ? await ValidationRepository.listAllIssuesForRun(latestValidationRun.id)
    : [];

  const auditEntries = await AuditLogService.search({ from: weekStartDate, to: weekEndDate, pageSize: 500 });

  const storeIds = results.map((r) => r.storeId).filter((id): id is string => !!id);
  const stores = await StoreRepository.findByIds(storeIds);
  const storeById = new Map<string, StoreLookup>(
    stores.map((s: { id: string; storeCode: string; storeName: string }) => [s.id, { storeCode: s.storeCode, storeName: s.storeName }])
  );

  return {
    weekStartDate,
    weekEndDate,
    results,
    logs,
    latestValidationRun,
    validationIssues,
    exceptions,
    rateCards,
    auditEntries: auditEntries.entries,
    storeById,
  };
}

export type ReportData = Awaited<ReturnType<typeof gatherReportData>>;
