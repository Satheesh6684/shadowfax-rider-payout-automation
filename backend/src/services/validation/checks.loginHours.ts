import { issue, LoginHoursRow, RawIssue } from "./types";

const MAX_REASONABLE_DAILY_HOURS = 24;

export function validateLoginHours(rows: LoginHoursRow[]): RawIssue[] {
  const issues: RawIssue[] = [];

  for (const row of rows) {
    if (!row.riderId.trim()) {
      issues.push(issue("LOGIN_HOURS", "BLANK_RIDER_ID", "ERROR", "Login record has a blank Rider ID."));
    }
    if (!row.storeCode || !row.storeCode.trim()) {
      issues.push(
        issue("LOGIN_HOURS", "BLANK_STORE_CODE", "WARNING", "Login record has no Store Code.", {
          riderId: row.riderId,
        })
      );
    } else if (row.storeId === null) {
      issues.push(
        issue(
          "LOGIN_HOURS",
          "UNKNOWN_STORE_CODE",
          "ERROR",
          `Store code "${row.storeCode}" is not a recognized store.`,
          { riderId: row.riderId, storeCode: row.storeCode }
        )
      );
    }

    const hours = Number(row.loginHours);
    if (hours < 0) {
      issues.push(
        issue("LOGIN_HOURS", "NEGATIVE_LOGIN_HOURS", "ERROR", `Login Hours is negative (${hours}).`, {
          riderId: row.riderId,
        })
      );
    } else if (hours > MAX_REASONABLE_DAILY_HOURS) {
      issues.push(
        issue(
          "LOGIN_HOURS",
          "EXCESSIVE_LOGIN_HOURS",
          "WARNING",
          `Login Hours (${hours}) exceeds ${MAX_REASONABLE_DAILY_HOURS} in a single day.`,
          { riderId: row.riderId }
        )
      );
    }
  }

  // Duplicate Rider + Date — the database's unique constraint already
  // prevents this within a single upload; kept for defensive completeness.
  const byKey = new Map<string, LoginHoursRow[]>();
  for (const row of rows) {
    const key = `${row.riderId}__${row.date.toISOString()}`;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }
  for (const [, group] of byKey) {
    if (group.length > 1) {
      issues.push(
        issue(
          "LOGIN_HOURS",
          "DUPLICATE_RIDER_DATE",
          "ERROR",
          `Rider "${group[0].riderId}" has ${group.length} login records for the same date.`,
          { riderId: group[0].riderId }
        )
      );
    }
  }

  // Same Rider ID associated with more than one Rider Name — a naming
  // inconsistency worth flagging even though it doesn't block anything.
  const namesByRider = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.riderName) continue;
    const set = namesByRider.get(row.riderId) ?? new Set<string>();
    set.add(row.riderName.trim());
    namesByRider.set(row.riderId, set);
  }
  for (const [riderId, names] of namesByRider) {
    if (names.size > 1) {
      issues.push(
        issue(
          "LOGIN_HOURS",
          "INCONSISTENT_RIDER_NAME",
          "WARNING",
          `Rider ID "${riderId}" appears with ${names.size} different names: ${Array.from(names).join(", ")}.`,
          { riderId }
        )
      );
    }
  }

  return issues;
}
