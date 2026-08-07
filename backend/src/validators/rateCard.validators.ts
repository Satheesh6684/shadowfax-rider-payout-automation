import { z } from "zod";

const decimalField = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number.` }).min(0, `${label} must be 0 or greater.`);

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
