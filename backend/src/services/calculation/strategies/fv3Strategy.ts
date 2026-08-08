import { PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";
import { runWeeklyPayTypeStrategy } from "../weeklyPayTypeHelper";

// F+V3 — added this turn. The business rules' own Architecture Requirements
// (§8) list it by name as one of the example strategies, alongside F+V1/F+V2,
// even though earlier turns of this project only scaffolded up to F+V2.
export const Fv3Strategy: PayoutStrategy = {
  name: "FV3",
  run(context: RiderWeekContext): StrategyResult {
    return runWeeklyPayTypeStrategy("FV3", "F+V3", context);
  },
};
