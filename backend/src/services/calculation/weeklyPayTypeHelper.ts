import { RiderWeekContext, StrategyResult } from "./types";

/**
 * Shared logic for the entire F+V family (F+V, F+V1, F+V2, F+V3, and any
 * future variant) — business rules §3. Weekly completed orders are checked
 * against configured bonus slabs first; if the rider qualifies for one
 * (or more — the highest-threshold qualifying slab wins, since these are
 * meant as increasing tiers), that slab's amount is returned instead of
 * the normal rate × orders calculation.
 *
 * Verified against the worked example: 90 weekly orders, variableRate=50
 * → normal = 4500, but a configured bonus slab at minOrders=90/amount=4800
 * qualifies, so the final result is 4800, not 4500.
 */
export function runWeeklyPayTypeStrategy(strategyKey: string, displayName: string, context: RiderWeekContext): StrategyResult {
  const rateCard = context.primaryRateCard;
  if (!rateCard) {
    return { status: "EXCEPTION", amount: null, message: `${displayName}: no Rate Card resolved for this rider's store.` };
  }

  const config = rateCard.weeklyPayConfig?.[strategyKey];
  if (!config || config.variableRate === undefined || config.variableRate === null) {
    return {
      status: "EXCEPTION",
      amount: null,
      message: `${displayName}: no weekly configuration ("${strategyKey}") found on this Rate Card.`,
    };
  }

  const normalAmount = config.variableRate * context.totalWeeklyOrders;

  const qualifyingSlabs = (config.bonusSlabs ?? [])
    .filter((slab) => context.totalWeeklyOrders >= slab.minOrders)
    .sort((a, b) => b.minOrders - a.minOrders);

  if (qualifyingSlabs.length > 0) {
    const best = qualifyingSlabs[0];
    return {
      status: "CALCULATED",
      amount: best.amount,
      message: `${displayName}: ${context.totalWeeklyOrders} weekly orders qualifies for the bonus slab at ${best.minOrders}+ orders → ₹${best.amount}.`,
    };
  }

  return {
    status: "CALCULATED",
    amount: normalAmount,
    message: `${displayName}: ${context.totalWeeklyOrders} weekly orders × ₹${config.variableRate} = ₹${normalAmount} (no bonus slab qualified).`,
  };
}
