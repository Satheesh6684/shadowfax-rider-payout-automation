import { issue, RawIssue, StagedRateCardRow } from "./types";

export function validateStagedRateCards(rows: StagedRateCardRow[]): RawIssue[] {
  const issues: RawIssue[] = [];

  for (const row of rows) {
    if (!row.rcType.trim()) {
      issues.push(issue("RATE_CARD", "BLANK_RC_TYPE", "ERROR", "RC Type is blank.", { storeCode: row.storeCode }));
    }
    if (!row.mgType.trim()) {
      issues.push(issue("RATE_CARD", "BLANK_MG_TYPE", "ERROR", "MG Type is blank.", { storeCode: row.storeCode }));
    }
    if (row.maximumOrders < row.minimumOrders) {
      issues.push(
        issue(
          "RATE_CARD",
          "MAX_LESS_THAN_MIN_ORDERS",
          "ERROR",
          `Maximum Orders (${row.maximumOrders}) is less than Minimum Orders (${row.minimumOrders}).`,
          { storeCode: row.storeCode }
        )
      );
    }

    const numericFields: [string, unknown][] = [
      ["mgAmount", row.mgAmount],
      ["variablePay", row.variablePay],
      ["weeklyIncentive", row.weeklyIncentive],
      ["orderIncentive", row.orderIncentive],
    ];
    for (const [field, value] of numericFields) {
      if (value === null || value === undefined) continue;
      if (Number(value) < 0) {
        issues.push(
          issue("RATE_CARD", `NEGATIVE_${field.toUpperCase()}`, "ERROR", `${field} is negative (${Number(value)}).`, {
            storeCode: row.storeCode,
          })
        );
      }
    }
  }

  // Duplicate store codes within this upload.
  const byStore = new Map<string, StagedRateCardRow[]>();
  for (const row of rows) {
    const list = byStore.get(row.storeCode) ?? [];
    list.push(row);
    byStore.set(row.storeCode, list);
  }
  for (const [storeCode, group] of byStore) {
    if (group.length > 1) {
      issues.push(
        issue("RATE_CARD", "DUPLICATE_STORE", "ERROR", `Store code "${storeCode}" appears ${group.length} times.`, {
          storeCode,
        })
      );
    }
  }

  return issues;
}
