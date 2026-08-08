import { PayoutStrategy } from "../types";
import { MgStrategy } from "./mgStrategy";
import { VariableStrategy } from "./variableStrategy";
import { FvStrategy } from "./fvStrategy";
import { Fv1Strategy } from "./fv1Strategy";
import { Fv2Strategy } from "./fv2Strategy";
import { Fv3Strategy } from "./fv3Strategy";
import { SpecialIncentiveStrategy } from "./specialIncentiveStrategy";

// Adding a new payment type: write one new strategy file implementing
// PayoutStrategy, add it here. Nothing else in the engine changes — this
// array is the only place a new strategy needs to be registered.
export const PAYOUT_STRATEGIES: PayoutStrategy[] = [
  MgStrategy,
  VariableStrategy,
  FvStrategy,
  Fv1Strategy,
  Fv2Strategy,
  Fv3Strategy,
  SpecialIncentiveStrategy,
];
