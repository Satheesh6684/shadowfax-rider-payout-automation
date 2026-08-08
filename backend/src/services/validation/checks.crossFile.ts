import { issue, LoginHoursRow, OrderRow, PaymentRow, RawIssue, StagedRateCardRow } from "./types";

interface CrossFileInputs {
  orders: OrderRow[];
  loginHours: LoginHoursRow[];
  payments: PaymentRow[];
  stagedRateCards: StagedRateCardRow[];
  liveRateCardStoreCodes: string[];
  activePaymentTypeNames: string[];
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function validateCrossFile(inputs: CrossFileInputs): RawIssue[] {
  const issues: RawIssue[] = [];
  const { orders, loginHours, payments, stagedRateCards, liveRateCardStoreCodes, activePaymentTypeNames } = inputs;

  const coveredStoreCodes = new Set([
    ...liveRateCardStoreCodes,
    ...stagedRateCards.map((r) => r.storeCode),
  ]);

  // Store has no Rate Card for this week — checked from Orders' perspective.
  const orderStoreCodesSeen = new Set<string>();
  for (const row of orders) {
    if (orderStoreCodesSeen.has(row.storeCode)) continue;
    orderStoreCodesSeen.add(row.storeCode);
    if (!coveredStoreCodes.has(row.storeCode)) {
      issues.push(
        issue(
          "ORDERS",
          "STORE_MISSING_RATE_CARD",
          "ERROR",
          `Store "${row.storeCode}" has orders but no Rate Card for this week.`,
          { storeCode: row.storeCode }
        )
      );
    }
  }

  // Same check from Login Hours' perspective.
  const loginStoreCodesSeen = new Set<string>();
  for (const row of loginHours) {
    if (!row.storeCode || loginStoreCodesSeen.has(row.storeCode)) continue;
    loginStoreCodesSeen.add(row.storeCode);
    if (!coveredStoreCodes.has(row.storeCode)) {
      issues.push(
        issue(
          "LOGIN_HOURS",
          "STORE_MISSING_RATE_CARD",
          "ERROR",
          `Store "${row.storeCode}" has login records but no Rate Card for this week.`,
          { storeCode: row.storeCode }
        )
      );
    }
  }

  // Orders without a matching Login Hours record for the same rider+date.
  const loginKeys = new Set(loginHours.map((r) => `${r.riderId}__${dateKey(r.date)}`));
  const ridersWithoutLogin = new Set<string>();
  for (const row of orders) {
    const key = `${row.riderId}__${dateKey(row.date)}`;
    if (!loginKeys.has(key)) {
      ridersWithoutLogin.add(row.riderId);
    }
  }
  for (const riderId of ridersWithoutLogin) {
    issues.push(
      issue("ORDERS", "ORDERS_WITHOUT_LOGIN", "WARNING", `Rider "${riderId}" has orders on a day with no login hours record.`, {
        riderId,
      })
    );
  }

  // Login Hours without any orders for the same rider+date.
  const orderKeys = new Set(orders.map((r) => `${r.riderId}__${dateKey(r.date)}`));
  const ridersWithoutOrders = new Set<string>();
  for (const row of loginHours) {
    const key = `${row.riderId}__${dateKey(row.date)}`;
    if (!orderKeys.has(key)) {
      ridersWithoutOrders.add(row.riderId);
    }
  }
  for (const riderId of ridersWithoutOrders) {
    issues.push(
      issue("LOGIN_HOURS", "LOGIN_WITHOUT_ORDERS", "WARNING", `Rider "${riderId}" logged in on a day with zero orders.`, {
        riderId,
      })
    );
  }

  // Valinor payments for riders with no Orders or Login activity this week at all.
  const activeRiderIds = new Set([...orders.map((r) => r.riderId), ...loginHours.map((r) => r.riderId)]);
  const valinorRidersSeen = new Set<string>();
  for (const row of payments) {
    if (valinorRidersSeen.has(row.riderId)) continue;
    valinorRidersSeen.add(row.riderId);
    if (!activeRiderIds.has(row.riderId)) {
      issues.push(
        issue(
          "VALINOR",
          "VALINOR_RIDER_MISSING_ACTIVITY",
          "WARNING",
          `Rider "${row.riderId}" has a Valinor payment but no Orders or Login Hours this week.`,
          { riderId: row.riderId }
        )
      );
    }
  }

  // Valinor payment types that don't match an active Payment Type.
  const activeNamesLower = new Set(activePaymentTypeNames.map((n) => n.toLowerCase()));
  const paymentTypesSeen = new Set<string>();
  for (const row of payments) {
    if (paymentTypesSeen.has(row.paymentType)) continue;
    paymentTypesSeen.add(row.paymentType);
    if (!activeNamesLower.has(row.paymentType.toLowerCase())) {
      issues.push(
        issue(
          "VALINOR",
          "UNKNOWN_PAYMENT_TYPE",
          "ERROR",
          `Payment type "${row.paymentType}" doesn't match any active Payment Type in Payment Configuration.`,
          { paymentType: row.paymentType }
        )
      );
    }
  }

  // Duplicate Riders — the same rider appearing at more than one distinct
  // store on the same date. A rider can't physically be at two stores at
  // once, so this is a genuine data-quality flag rather than a normal
  // multi-store week (which is fine — this only fires when the SAME DAY
  // shows conflicting stores).
  const storesByRiderDate = new Map<string, Set<string>>();
  for (const row of orders) {
    const key = `${row.riderId}__${dateKey(row.date)}`;
    const set = storesByRiderDate.get(key) ?? new Set<string>();
    set.add(row.storeCode);
    storesByRiderDate.set(key, set);
  }
  for (const [key, stores] of storesByRiderDate) {
    if (stores.size > 1) {
      const [riderId, date] = key.split("__");
      issues.push(
        issue(
          "ORDERS",
          "RIDER_MULTIPLE_STORES_SAME_DAY",
          "WARNING",
          `Rider "${riderId}" has orders at ${stores.size} different stores on ${date}: ${Array.from(stores).join(", ")}.`,
          { riderId, date, storeCodes: Array.from(stores) }
        )
      );
    }
  }

  return issues;
}
