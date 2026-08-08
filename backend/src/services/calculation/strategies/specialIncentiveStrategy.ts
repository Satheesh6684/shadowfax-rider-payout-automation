import { formulaNotConfigured, PayoutStrategy, RiderWeekContext, StrategyResult } from "../types";

/**
 * SpecialIncentive rows exist on the Rate Card (name, amount, eligibility)
 * and are fetchable, but `eligibility` is a free-text field — there's no
 * structured rule to evaluate "does this rider qualify" against. The
 * business rules received this turn don't cover Special Incentives either,
 * so this stays unconfigured rather than guessing.
 */
export const SpecialIncentiveStrategy: PayoutStrategy = {
  name: "SPECIAL_INCENTIVE",
  run(context: RiderWeekContext): StrategyResult {
    if (!context.primaryRateCard) {
      return {
        status: "SKIPPED",
        amount: null,
        message: "SPECIAL_INCENTIVE: no Rate Card resolved — nothing to evaluate.",
      };
    }
    return formulaNotConfigured("SPECIAL_INCENTIVE");
  },
};
