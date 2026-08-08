import { PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";
import { runWeeklyPayTypeStrategy } from "../weeklyPayTypeHelper";

export const FvStrategy: PayoutStrategy = {
  name: "FV",
  run(context: RiderWeekContext): StrategyResult {
    return runWeeklyPayTypeStrategy("FV", "F+V", context);
  },
};
