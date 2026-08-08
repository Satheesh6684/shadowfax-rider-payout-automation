import { resolveSlabAmount } from "../slabResolver";
import { PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";

/**
 * Variable Pay — daily, grouped by Date + Store + Rider (business rules
 * §2). Two configurations, matching the Rate Card's own fields:
 *  - Method 2 / Slab mode: if O1-O7/Var1-Var7 are configured, resolve the
 *    applicable per-order rate for that day's order count (highest slab
 *    open-ended — explicitly confirmed by the "19+" tier in the business
 *    rules' own worked example).
 *  - Method 1 / Flat mode (fallback): if no slabs are configured, use the
 *    store's base Variable Pay rate × completed orders — a required field
 *    every rate card already has, so this is the always-available default.
 *
 * No Minimum Login Hours gate here — the business rules only state that
 * requirement for MG (§1); Variable Pay's eligibility is purely about
 * completed orders.
 */
export const VariableStrategy: PayoutStrategy = {
  name: "VARIABLE",
  run(context: RiderWeekContext): StrategyResult {
    if (context.dailyGroups.length === 0) {
      return { status: "SKIPPED", amount: null, message: "VARIABLE: no daily activity this week." };
    }

    let total = 0;
    const notes: string[] = [];

    for (const day of context.dailyGroups) {
      const dateLabel = day.date.toISOString().slice(0, 10);

      if (!day.rateCard) {
        return {
          status: "EXCEPTION",
          amount: null,
          message: `VARIABLE: no Rate Card resolved for store "${day.storeCode}" on ${dateLabel}.`,
        };
      }

      let rate: number;
      if (day.rateCard.variableSlabs.length > 0) {
        const resolved = resolveSlabAmount(day.completedOrders, day.rateCard.variableSlabs);
        if (resolved === null) {
          return {
            status: "EXCEPTION",
            amount: null,
            message: `VARIABLE: could not resolve a slab rate for ${day.completedOrders} orders on ${dateLabel} (store "${day.storeCode}").`,
          };
        }
        rate = resolved;
      } else {
        // Flat fallback — Method 1: Orders × Variable Pay.
        rate = day.rateCard.variablePay;
      }

      const dayAmount = rate * day.completedOrders;
      total += dayAmount;
      notes.push(`${dateLabel}: ${day.completedOrders} orders × ₹${rate} = ₹${dayAmount}`);
    }

    return { status: "CALCULATED", amount: total, message: `VARIABLE: ${notes.join(" ")}` };
  },
};
