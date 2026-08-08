import * as XLSX from "xlsx";
import { ReportData } from "./reportData";
import { formatWeekLabel } from "../../utils/week";

function sheetFromRows(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([["No data for this week"]]);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31)); // Excel sheet name limit
}

const FV_STRATEGIES = new Set(["FV", "FV1", "FV2", "FV3"]);

export function buildWeeklyPayoutWorkbook(data: ReportData): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const weekLabel = formatWeekLabel(data.weekStartDate, data.weekEndDate);

  const totalEligible = data.results.reduce((sum, r) => sum + Number(r.totalEligibleAmount ?? 0), 0);
  const totalActual = data.results.reduce((sum, r) => sum + Number(r.actualAmount ?? 0), 0);
  const totalPending = data.results.reduce((sum, r) => sum + Number(r.pendingAmount ?? 0), 0);
  const calculatedCount = data.results.filter((r) => r.status === "CALCULATED").length;
  const exceptionCount = data.results.filter((r) => r.status === "EXCEPTION").length;

  // ---- Summary ----
  sheetFromRows(workbook, "Summary", [
    { Metric: "Week", Value: weekLabel },
    { Metric: "Validation Status", Value: data.latestValidationRun?.status ?? "Not run" },
    { Metric: "Total Riders", Value: data.results.length },
    { Metric: "Calculated", Value: calculatedCount },
    { Metric: "Exceptions", Value: exceptionCount },
    { Metric: "Total Eligible Amount", Value: totalEligible.toFixed(2) },
    { Metric: "Total Actual (Valinor) Amount", Value: totalActual.toFixed(2) },
    { Metric: "Total Pending Amount", Value: totalPending.toFixed(2) },
    { Metric: "Open Exceptions", Value: data.exceptions.filter((e) => e.status === "OPEN").length },
    { Metric: "Report Generated", Value: new Date().toISOString() },
  ]);

  // ---- MG ----
  sheetFromRows(
    workbook,
    "MG",
    data.logs
      .filter((l) => l.strategyName === "MG")
      .map((l) => ({
        "Rider ID": l.riderId,
        Status: l.status,
        Amount: l.amount ? Number(l.amount).toFixed(2) : "",
        Message: l.message,
      }))
  );

  // ---- Variable ----
  sheetFromRows(
    workbook,
    "Variable",
    data.logs
      .filter((l) => l.strategyName === "VARIABLE")
      .map((l) => ({
        "Rider ID": l.riderId,
        Status: l.status,
        Amount: l.amount ? Number(l.amount).toFixed(2) : "",
        Message: l.message,
      }))
  );

  // ---- F+V (family: FV, FV1, FV2, FV3 combined with a Type column) ----
  sheetFromRows(
    workbook,
    "F+V",
    data.logs
      .filter((l) => FV_STRATEGIES.has(l.strategyName))
      .map((l) => ({
        "Rider ID": l.riderId,
        Type: l.strategyName,
        Status: l.status,
        Amount: l.amount ? Number(l.amount).toFixed(2) : "",
        Message: l.message,
      }))
  );

  // ---- Exceptions ----
  sheetFromRows(
    workbook,
    "Exceptions",
    data.exceptions.map((e) => ({
      Source: e.source,
      Category: e.category,
      Check: e.checkName,
      "Rider ID": e.riderId ?? "",
      Message: e.message,
      Status: e.status,
      Occurrences: e.occurrenceCount,
      "Last Seen": e.lastSeenAt.toISOString(),
    }))
  );

  // ---- Validation Errors ----
  sheetFromRows(
    workbook,
    "Validation Errors",
    data.validationIssues
      .filter((i) => i.severity === "ERROR")
      .map((i) => ({
        Category: i.category,
        Check: i.checkName,
        Message: i.message,
        Context: i.context ? JSON.stringify(i.context) : "",
      }))
  );

  // ---- Missing Stores ----
  sheetFromRows(
    workbook,
    "Missing Stores",
    data.validationIssues
      .filter((i) => i.checkName === "UNKNOWN_STORE_CODE" || i.checkName === "STORE_MISSING_RATE_CARD")
      .map((i) => ({
        Check: i.checkName,
        Category: i.category,
        Message: i.message,
        Context: i.context ? JSON.stringify(i.context) : "",
      }))
  );

  // ---- Audit ----
  sheetFromRows(
    workbook,
    "Audit",
    data.auditEntries.map((a) => ({
      Module: a.module,
      Action: a.action,
      User: a.userId ?? "",
      "Occurred At": a.occurredAt.toISOString(),
    }))
  );

  // ---- Weekly Summary (breakdown by RC Type) ----
  const rcTypeGroups = new Map<string, { count: number }>();
  for (const rc of data.rateCards) {
    const g = rcTypeGroups.get(rc.rcType) ?? { count: 0 };
    g.count += 1;
    rcTypeGroups.set(rc.rcType, g);
  }
  sheetFromRows(
    workbook,
    "Weekly Summary",
    Array.from(rcTypeGroups.entries()).map(([rcType, g]) => ({
      Week: weekLabel,
      "RC Type": rcType,
      "Store Count": g.count,
    }))
  );

  // ---- Store Summary ----
  const byStore = new Map<string, { storeCode: string; storeName: string; riders: number; eligible: number; actual: number; pending: number; exceptions: number }>();
  for (const r of data.results) {
    const store = r.storeId ? data.storeById.get(r.storeId) : undefined;
    const key = r.storeId ?? "UNRESOLVED";
    const entry = byStore.get(key) ?? {
      storeCode: store?.storeCode ?? "Unresolved",
      storeName: store?.storeName ?? "Unresolved",
      riders: 0,
      eligible: 0,
      actual: 0,
      pending: 0,
      exceptions: 0,
    };
    entry.riders += 1;
    entry.eligible += Number(r.totalEligibleAmount ?? 0);
    entry.actual += Number(r.actualAmount ?? 0);
    entry.pending += Number(r.pendingAmount ?? 0);
    if (r.status === "EXCEPTION") entry.exceptions += 1;
    byStore.set(key, entry);
  }
  sheetFromRows(
    workbook,
    "Store Summary",
    Array.from(byStore.values()).map((s) => ({
      "Store Code": s.storeCode,
      "Store Name": s.storeName,
      Riders: s.riders,
      Exceptions: s.exceptions,
      "Total Eligible": s.eligible.toFixed(2),
      "Total Actual": s.actual.toFixed(2),
      "Total Pending": s.pending.toFixed(2),
    }))
  );

  // ---- Rider Summary ----
  sheetFromRows(
    workbook,
    "Rider Summary",
    data.results.map((r) => {
      const store = r.storeId ? data.storeById.get(r.storeId) : undefined;
      return {
        "Rider ID": r.riderId,
        Store: store?.storeName ?? "Unresolved",
        "Store Code": store?.storeCode ?? "",
        Status: r.status,
        "Total Eligible": r.totalEligibleAmount ? Number(r.totalEligibleAmount).toFixed(2) : "",
        "Actual (Valinor)": r.actualAmount ? Number(r.actualAmount).toFixed(2) : "",
        Pending: r.pendingAmount ? Number(r.pendingAmount).toFixed(2) : "",
        Remarks: r.remarks ?? "",
      };
    })
  );

  return workbook;
}
