export type StrategyStatus = "CALCULATED" | "SKIPPED" | "EXCEPTION";

export interface StrategyResult {
  status: StrategyStatus;
  amount: number | null;
  message: string;
}

export interface ResolvedRateCard {
  rcType: string;
  mgType: string;
  minimumOrders: number;
  maximumOrders: number;
  mgAmount: number;
  variablePay: number;
  weeklyIncentive: number | null;
  orderIncentive: number | null;
  minimumLoginHours: number | null;
  mgSlabs: { maxOrders: number; amount: number }[];
  variableSlabs: { maxOrders: number; amount: number }[];
  weeklyPayConfig: Record<string, { variableRate?: number; bonusSlabs?: { minOrders: number; amount: number }[] }> | null;
}

/** One (date, store) group for a rider — MG and Variable are calculated
 * per this grouping, exactly as specified: "Grouping keys: Date, Store
 * Name, Rider ID." A rider who worked at two stores in a week gets two
 * separate groups, each resolved against its own store's rate card. */
export interface DailyStoreGroup {
  date: Date;
  storeCode: string;
  storeId: string | null;
  completedOrders: number;
  loginHours: number;
  rateCard: ResolvedRateCard | null;
}

export interface RiderWeekContext {
  riderId: string;
  weekStartDate: Date;
  dailyGroups: DailyStoreGroup[];
  totalWeeklyOrders: number;
  primaryStoreId: string | null;
  primaryStoreCode: string | null;
  /** The rate card used for weekly (F+V-family) calculations — the
   * rider's most-frequent store's rate card. If a rider genuinely splits
   * their week across stores with different weekly configs, that's a real
   * ambiguity the business rules don't resolve; using the primary store is
   * a flagged, reasonable default, not a silent invention of a formula. */
  primaryRateCard: ResolvedRateCard | null;
  valinorAddedByCategory: Record<string, number>;
  valinorAddedTotal: number;
}

export interface PayoutStrategy {
  name: string;
  run(context: RiderWeekContext): StrategyResult;
}

export function formulaNotConfigured(strategyName: string): StrategyResult {
  return {
    status: "EXCEPTION",
    amount: null,
    message: `${strategyName}: payout formula not yet configured — awaiting business rules.`,
  };
}
