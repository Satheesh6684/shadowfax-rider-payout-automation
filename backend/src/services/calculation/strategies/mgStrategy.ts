import { resolveSlabAmount } from "../slabResolver";
import { PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";

/** Explicitly stated as the business default across two separate rule sets
 * ("Normally 8.5 hours" / "Default minimum is 8.5 hours") — this is no
 * longer an invented fallback, it's implementing what was given. A rate
 * card's own configured Minimum Login Hours always wins; this only applies
 * when nothing was configured at all. */
const DEFAULT_MINIMUM_LOGIN_HOURS = 8.5;

/**
 * MG (Minimum Guarantee) — daily, grouped by Date + Store + Rider (business
 * rules §1). Per day: eligible only if Login Hours >= that store's
 * configured (or defaulted) Minimum Login Hours AND Completed Orders
 * qualify. Eligible days sum into the week's MG total.
 *
 * Two supported configurations per store, matching the Rate Card's own
 * fields:
 *  - Slab mode: if O1-O7/MG1-MG7 are configured, use them (multi-tier,
 *    highest slab open-ended — confirmed by the Variable rules' explicit
 *    "19+" tier).
 *  - Flat mode (fallback): if no slabs are configured, use the store's
 *    base Minimum/Maximum Orders + MG Amount — these are required fields
 *    every rate card already has, so this is the always-available default,
 *    not a made-up shortcut. Orders must fall within [min, max] inclusive;
 *    unlike the slab chain, a single flat bracket has no open-ended top.
 *
 * If ANY day in the week can't be resolved at all (no rate card found),
 * the whole strategy reports EXCEPTION rather than summing only the days
 * it could compute — a partial sum presented as a final number would be
 * indistinguishable from a complete one, which is worse than an honest
 * exception for something that becomes real pay.
 */
export const MgStrategy: PayoutStrategy = {
  name: "MG",
  run(context: RiderWeekContext): StrategyResult {
    if (context.dailyGroups.length === 0) {
      return { status: "SKIPPED", amount: null, message: "MG: no daily activity this week." };
    }

    let total = 0;
    const notes: string[] = [];

    for (const day of context.dailyGroups) {
      const dateLabel = day.date.toISOString().slice(0, 10);

      if (!day.rateCard) {
        return {
          status: "EXCEPTION",
          amount: null,
          message: `MG: no Rate Card resolved for store "${day.storeCode}" on ${dateLabel}.`,
        };
      }

      const minimumLoginHours = day.rateCard.minimumLoginHours ?? DEFAULT_MINIMUM_LOGIN_HOURS;
      if (day.loginHours < minimumLoginHours) {
        notes.push(`${dateLabel}: not eligible — logged ${day.loginHours}h, needs ${minimumLoginHours}h.`);
        continue;
      }

      let dayAmount: number | null;
      if (day.rateCard.mgSlabs.length > 0) {
        dayAmount = resolveSlabAmount(day.completedOrders, day.rateCard.mgSlabs);
        if (dayAmount === null) {
          return {
            status: "EXCEPTION",
            amount: null,
            message: `MG: could not resolve a slab for ${day.completedOrders} orders on ${dateLabel} (store "${day.storeCode}").`,
          };
        }
      } else {
        // Flat fallback — the store's base Minimum/Maximum Orders + MG
        // Amount, a single bracket with both a floor and a ceiling.
        const withinRange =
          day.completedOrders >= day.rateCard.minimumOrders && day.completedOrders <= day.rateCard.maximumOrders;
        if (!withinRange) {
          notes.push(
            `${dateLabel}: not eligible — ${day.completedOrders} orders outside configured range [${day.rateCard.minimumOrders}, ${day.rateCard.maximumOrders}].`
          );
          continue;
        }
        dayAmount = day.rateCard.mgAmount;
      }

      total += dayAmount;
      notes.push(`${dateLabel}: ${day.completedOrders} orders, ${day.loginHours}h → ₹${dayAmount}`);
    }

    return { status: "CALCULATED", amount: total, message: `MG: ${notes.join(" ")}` };
  },
};
