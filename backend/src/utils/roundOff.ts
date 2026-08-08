export type RoundingMode = "HALF_UP" | "HALF_DOWN" | "CEILING" | "FLOOR";

/**
 * Standard currency rounding. Defaults to 2 decimal places, half-up — the
 * common convention for INR payouts — but every parameter is explicit so
 * this can be retargeted the moment the business specifies otherwise
 * (e.g. round to the nearest whole rupee) without touching call sites.
 */
export function roundCurrency(value: number, precision = 2, mode: RoundingMode = "HALF_UP"): number {
  const factor = 10 ** precision;
  const scaled = value * factor;

  let rounded: number;
  switch (mode) {
    case "CEILING":
      rounded = Math.ceil(scaled);
      break;
    case "FLOOR":
      rounded = Math.floor(scaled);
      break;
    case "HALF_DOWN":
      rounded = Math.sign(scaled) * Math.ceil(Math.abs(scaled) - 0.5);
      break;
    case "HALF_UP":
    default:
      rounded = Math.sign(scaled) * Math.round(Math.abs(scaled));
      break;
  }

  return rounded / factor;
}
