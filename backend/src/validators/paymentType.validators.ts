import { z } from "zod";

export const PAYMENT_CATEGORIES = [
  "ORDER_INCENTIVE",
  "WEEKLY_INCENTIVE",
  "MANUAL_INCENTIVE",
  "SPECIAL_INCENTIVE",
  "RECOVERY",
  "PENALTY",
] as const;

export const CALCULATION_METHODS = ["FIXED_AMOUNT", "PERCENTAGE", "FORMULA_BASED"] as const;

export const PAYMENT_TYPE_STATUSES = ["ACTIVE", "INACTIVE"] as const;

const paymentTypeFields = z.object({
  name: z.string().trim().min(1, "Payment type name is required."),
  category: z.enum(PAYMENT_CATEGORIES, {
    errorMap: () => ({ message: "Select a valid payment category." }),
  }),
  calculationMethod: z.enum(CALCULATION_METHODS, {
    errorMap: () => ({ message: "Select a valid calculation method." }),
  }),
  priority: z.coerce.number().int("Priority must be a whole number.").min(0, "Priority must be 0 or greater."),
  description: z.string().trim().optional(),
});

export const createPaymentTypeSchema = paymentTypeFields;
export type CreatePaymentTypeInput = z.infer<typeof createPaymentTypeSchema>;

export const updatePaymentTypeSchema = paymentTypeFields.extend({
  changeSummary: z.string().trim().min(1, "A short description of what changed is required."),
});
export type UpdatePaymentTypeInput = z.infer<typeof updatePaymentTypeSchema>;

export const updatePaymentTypeStatusSchema = z.object({
  status: z.enum(PAYMENT_TYPE_STATUSES, { errorMap: () => ({ message: "Status must be ACTIVE or INACTIVE." }) }),
});
export type UpdatePaymentTypeStatusInput = z.infer<typeof updatePaymentTypeStatusSchema>;

export const listPaymentTypesQuerySchema = z.object({
  category: z.enum(PAYMENT_CATEGORIES).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "category", "priority", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
