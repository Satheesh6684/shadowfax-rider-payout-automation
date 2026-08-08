import { buildSlabs } from "./slabResolver";
import { ResolvedRateCard } from "./types";

function toNumberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** Maps a live WeeklyRateCard row (full slab support) into the shape
 * strategies consume. */
export function mapLiveRateCard(rc: {
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: unknown;
  variablePay: unknown;
  weeklyIncentive: unknown;
  orderIncentive: unknown;
  minimumLoginHours: unknown;
  o1: number | null;
  o2: number | null;
  o3: number | null;
  o4: number | null;
  o5: number | null;
  o6: number | null;
  o7: number | null;
  mg1: unknown;
  mg2: unknown;
  mg3: unknown;
  mg4: unknown;
  mg5: unknown;
  mg6: unknown;
  mg7: unknown;
  var1: unknown;
  var2: unknown;
  var3: unknown;
  var4: unknown;
  var5: unknown;
  var6: unknown;
  var7: unknown;
  weeklyPayConfig: unknown;
}): ResolvedRateCard {
  const thresholds = [rc.o1, rc.o2, rc.o3, rc.o4, rc.o5, rc.o6, rc.o7];
  const mgAmounts = [rc.mg1, rc.mg2, rc.mg3, rc.mg4, rc.mg5, rc.mg6, rc.mg7].map(toNumberOrNull);
  const varAmounts = [rc.var1, rc.var2, rc.var3, rc.var4, rc.var5, rc.var6, rc.var7].map(toNumberOrNull);

  return {
    rcType: rc.rcType,
    mgType: rc.mgType,
    minimumOrders: rc.minimumOrders,
    maximumOrders: rc.maximumOrders,
    mgAmount: Number(rc.mgAmount),
    variablePay: Number(rc.variablePay),
    weeklyIncentive: toNumberOrNull(rc.weeklyIncentive),
    orderIncentive: toNumberOrNull(rc.orderIncentive),
    minimumLoginHours: toNumberOrNull(rc.minimumLoginHours),
    mgSlabs: buildSlabs(thresholds, mgAmounts),
    variableSlabs: buildSlabs(thresholds, varAmounts),
    weeklyPayConfig: (rc.weeklyPayConfig as ResolvedRateCard["weeklyPayConfig"]) ?? null,
  };
}

/** Maps a staged (bulk-uploaded) rate card row — these don't support slabs
 * yet (see README: representing nested slab data in a flat CSV row wasn't
 * in scope this pass), so every slab-dependent field is empty/null. A
 * store whose ONLY rate card is a bulk upload will correctly report
 * EXCEPTION from MG/Variable/F+V until it's configured with slabs via the
 * live Rate Card form. */
export function mapStagedRateCard(rc: {
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: unknown;
  variablePay: unknown;
  weeklyIncentive: unknown;
  orderIncentive: unknown;
}): ResolvedRateCard {
  return {
    rcType: rc.rcType,
    mgType: rc.mgType,
    minimumOrders: rc.minimumOrders,
    maximumOrders: rc.maximumOrders,
    mgAmount: Number(rc.mgAmount),
    variablePay: Number(rc.variablePay),
    weeklyIncentive: toNumberOrNull(rc.weeklyIncentive),
    orderIncentive: toNumberOrNull(rc.orderIncentive),
    minimumLoginHours: null,
    mgSlabs: [],
    variableSlabs: [],
    weeklyPayConfig: null,
  };
}
