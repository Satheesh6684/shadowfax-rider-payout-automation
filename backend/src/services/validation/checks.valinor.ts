import { issue, PaymentRow, RawIssue } from "./types";

export function validateValinor(rows: PaymentRow[]): RawIssue[] {
  const issues: RawIssue[] = [];

  for (const row of rows) {
    if (!row.riderId.trim()) {
      issues.push(issue("VALINOR", "BLANK_RIDER_ID", "ERROR", "Payment record has a blank Rider ID."));
    }
    if (Number(row.amount) < 0) {
      issues.push(
        issue("VALINOR", "NEGATIVE_AMOUNT", "ERROR", `Payment amount is negative (${Number(row.amount)}).`, {
          riderId: row.riderId,
          paymentType: row.paymentType,
        })
      );
    }
    if (!row.considered || !row.considered.trim()) {
      issues.push(
        issue("VALINOR", "MISSING_CONSIDERED_VALUE", "WARNING", "The Considered column is blank for this row.", {
          riderId: row.riderId,
          paymentType: row.paymentType,
        })
      );
    }
  }

  // Exact duplicate payment records — same rider, date, type, and amount.
  const byKey = new Map<string, PaymentRow[]>();
  for (const row of rows) {
    const key = `${row.riderId}__${row.date.toISOString()}__${row.paymentType}__${row.amount}`;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }
  for (const [, group] of byKey) {
    if (group.length > 1) {
      issues.push(
        issue(
          "VALINOR",
          "DUPLICATE_PAYMENT_RECORD",
          "WARNING",
          `Rider "${group[0].riderId}" has ${group.length} identical "${group[0].paymentType}" payment records.`,
          { riderId: group[0].riderId, paymentType: group[0].paymentType }
        )
      );
    }
  }

  return issues;
}
