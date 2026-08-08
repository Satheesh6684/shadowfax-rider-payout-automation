import { PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";
import { runWeeklyPayTypeStrategy } from "../weeklyPayTypeHelper";

export const Fv2Strategy: PayoutStrategy = {
  name: "FV2",
  run(context: RiderWeekContext): StrategyResult {
    return runWeeklyPayTypeStrategy("FV2", "F+V2", context);
  },
};
