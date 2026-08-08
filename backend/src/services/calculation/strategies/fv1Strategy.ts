import { PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";
import { runWeeklyPayTypeStrategy } from "../weeklyPayTypeHelper";

export const Fv1Strategy: PayoutStrategy = {
  name: "FV1",
  run(context: RiderWeekContext): StrategyResult {
    return runWeeklyPayTypeStrategy("FV1", "F+V1", context);
  },
};
