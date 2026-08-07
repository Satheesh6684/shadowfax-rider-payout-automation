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

const baseFields = {
  name: z.string().trim().min(1, "Payment type name is required."),
  category: z.enum(PAYMENT_CATEGORIES, { errorMap: () => ({ message: "Select a category." }) }),
  calculationMethod: z.enum(CALCULATION_METHODS, { errorMap: () => ({ message: "Select a calculation method." }) }),
  priority: z.coerce.number().int("Priority must be a whole number.").min(0, "Priority must be 0 or greater."),
  description: z.string().trim().optional(),
};

export const createPaymentTypeFormSchema = z.object(baseFields);
export type CreatePaymentTypeFormValues = z.infer<typeof createPaymentTypeFormSchema>;

export const editPaymentTypeFormSchema = z.object({
  ...baseFields,
  changeSummary: z.string().trim().min(1, "Describe what changed before saving."),
});
export type EditPaymentTypeFormValues = z.infer<typeof editPaymentTypeFormSchema>;

export const CATEGORY_LABELS: Record<(typeof PAYMENT_CATEGORIES)[number], string> = {
  ORDER_INCENTIVE: "Order Incentive",
  WEEKLY_INCENTIVE: "Weekly Incentive",
  MANUAL_INCENTIVE: "Manual Incentive",
  SPECIAL_INCENTIVE: "Special Incentive",
  RECOVERY: "Recovery",
  PENALTY: "Penalty",
};

export const CALCULATION_METHOD_LABELS: Record<(typeof CALCULATION_METHODS)[number], string> = {
  FIXED_AMOUNT: "Fixed Amount",
  PERCENTAGE: "Percentage",
  FORMULA_BASED: "Formula Based",
};
