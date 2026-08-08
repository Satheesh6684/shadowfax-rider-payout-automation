export interface Slab {
  maxOrders: number;
  amount: number;
}

/**
 * Builds a slab list from parallel O-threshold / amount arrays (e.g. this
 * rate card's o1..o7 and mg1..mg7), keeping only the pairs where BOTH the
 * threshold and the amount are configured, sorted ascending. A store that
 * only fills in o1/mg1 gets a one-slab list — the engine never assumes a
 * fixed count of 7.
 */
export function buildSlabs(thresholds: (number | null | undefined)[], amounts: (number | null | undefined)[]): Slab[] {
  const slabs: Slab[] = [];
  for (let i = 0; i < thresholds.length; i++) {
    const maxOrders = thresholds[i];
    const amount = amounts[i];
    if (maxOrders !== null && maxOrders !== undefined && amount !== null && amount !== undefined) {
      slabs.push({ maxOrders, amount });
    }
  }
  return slabs.sort((a, b) => a.maxOrders - b.maxOrders);
}

/**
 * Finds the applicable slab amount for a given order count: the first slab
 * (ascending by maxOrders) whose threshold the order count doesn't exceed.
 * If the order count exceeds every configured slab, the highest slab's
 * amount applies (open-ended top tier) — see the README for why this
 * specific boundary behavior is an explicit, flagged assumption rather than
 * something the business rules stated outright.
 *
 * With exactly one slab configured, every order count resolves to that
 * slab's amount — which is exactly "Type A flat variable" from the
 * business rules, not a separate code path.
 */
export function resolveSlabAmount(orderCount: number, slabs: Slab[]): number | null {
  if (slabs.length === 0) return null;
  for (const slab of slabs) {
    if (orderCount <= slab.maxOrders) return slab.amount;
  }
  return slabs[slabs.length - 1].amount;
}
