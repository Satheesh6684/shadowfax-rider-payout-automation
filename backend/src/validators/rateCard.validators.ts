import { z } from "zod";

const decimalField = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number.` }).min(0, `${label} must be 0 or greater.`);

const optionalNonNegativeInt = z.coerce.number().int().min(0).optional().nullable();
const optionalNonNegativeDecimal = z.coerce.number().min(0).optional().nullable();

const bonusSlabSchema = z.object({
  minOrders: z.coerce.number().int().min(0),
  amount: z.coerce.number().min(0),
});

const weeklyPayTypeConfigSchema = z.object({
  variableRate: z.coerce.number().min(0).optional(),
  bonusSlabs: z.array(bonusSlabSchema).optional(),
});

// Calculation Engine business-rule fields (additive) — Minimum Login Hours,
// the O1-O7/MG1-MG7/Var1-Var7 slabs exactly as named in the business rules,
// and the generic weekly-pay-type config for the extensible F+V family.
// Every field here is optional: a rate card that hasn't configured these
// yet keeps working exactly as before, it just can't be used by MG/
// Variable/F+V until they're filled in (the calculation engine reports a
// clear exception in that case, not a crash or a guessed number).
const calculationFieldsSchema = z.object({
  minimumLoginHours: optionalNonNegativeDecimal,
  o1: optionalNonNegativeInt,
  o2: optionalNonNegativeInt,
  o3: optionalNonNegativeInt,
  o4: optionalNonNegativeInt,
  o5: optionalNonNegativeInt,
  o6: optionalNonNegativeInt,
  o7: optionalNonNegativeInt,
  mg1: optionalNonNegativeDecimal,
  mg2: optionalNonNegativeDecimal,
  mg3: optionalNonNegativeDecimal,
  mg4: optionalNonNegativeDecimal,
  mg5: optionalNonNegativeDecimal,
  mg6: optionalNonNegativeDecimal,
  mg7: optionalNonNegativeDecimal,
  var1: optionalNonNegativeDecimal,
  var2: optionalNonNegativeDecimal,
  var3: optionalNonNegativeDecimal,
  var4: optionalNonNegativeDecimal,
  var5: optionalNonNegativeDecimal,
  var6: optionalNonNegativeDecimal,
  var7: optionalNonNegativeDecimal,
  weeklyPayConfig: z.record(weeklyPayTypeConfigSchema).optional().nullable(),
});
export type CalculationFieldsInput = z.infer<typeof calculationFieldsSchema>;

// Shared by create and update — the numeric/text business rules from the
// brief (§VALIDATIONS) live here in one place.
const rateCardFieldsSchema = z
  .object({
    cityName: z.string().trim().min(1, "City is required."),
    storeName: z.string().trim().min(1, "Store Name is required."),
    storeCode: z.string().trim().min(1, "Store Code is required."),
    rcType: z.string().trim().min(1, "RC Type is required."),
    mgType: z.string().trim().min(1, "MG Type is required."),
    minimumOrders: z.coerce
      .number({ invalid_type_error: "Minimum Orders must be a number." })
      .int("Minimum Orders must be a whole number.")
      .min(0, "Minimum Orders must be 0 or greater."),
    maximumOrders: z.coerce
      .number({ invalid_type_error: "Maximum Orders must be a number." })
      .int("Maximum Orders must be a whole number.")
      .min(0, "Maximum Orders must be 0 or greater."),
    mgAmount: decimalField("MG Amount"),
    variablePay: decimalField("Variable Amount"),
    weeklyIncentive: decimalField("Weekly Incentive").optional(),
    orderIncentive: decimalField("Order Incentive").optional(),
  })
  .and(calculationFieldsSchema)
  .refine((data) => data.maximumOrders >= data.minimumOrders, {
    message: "Maximum Orders must be greater than or equal to Minimum Orders.",
    path: ["maximumOrders"],
  });

export const createRateCardSchema = rateCardFieldsSchema.and(
  z.object({
    weekStartDate: z.string().min(1, "Week is required."),
  })
);
export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;

// Store identity (city/store/code) and week are fixed at creation — editing
// changes the rate card's numbers, not which store or week it belongs to.
export const updateRateCardSchema = z
  .object({
    rcType: z.string().trim().min(1, "RC Type is required."),
    mgType: z.string().trim().min(1, "MG Type is required."),
    minimumOrders: z.coerce.number().int().min(0, "Minimum Orders must be 0 or greater."),
    maximumOrders: z.coerce.number().int().min(0, "Maximum Orders must be 0 or greater."),
    mgAmount: decimalField("MG Amount"),
    variablePay: decimalField("Variable Amount"),
    weeklyIncentive: decimalField("Weekly Incentive").optional(),
    orderIncentive: decimalField("Order Incentive").optional(),
    changeSummary: z.string().trim().min(1, "A short description of what changed is required."),
  })
  .and(calculationFieldsSchema)
  .refine((data) => data.maximumOrders >= data.minimumOrders, {
    message: "Maximum Orders must be greater than or equal to Minimum Orders.",
    path: ["maximumOrders"],
  });
export type UpdateRateCardInput = z.infer<typeof updateRateCardSchema>;

export const listRateCardsQuerySchema = z.object({
  weekStartDate: z.string().optional(),
  city: z.string().optional(),
  storeCode: z.string().optional(),
  rcType: z.string().optional(),
  status: z.enum(["ACTIVE", "LOCKED", "DELETED"]).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["storeName", "storeCode", "city", "mgAmount", "variablePay", "createdAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const weekParamSchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const copyPreviousWeekSchema = z.object({
  sourceWeekStartDate: z.string().min(1, "Source week is required."),
  targetWeekStartDate: z.string().min(1, "Target week is required."),
});

export const lockWeekSchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const auditLogQuerySchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
