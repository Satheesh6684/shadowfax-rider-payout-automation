import { z } from "zod";

const numberField = (label: string, { integer = false }: { integer?: boolean } = {}) => {
  const base = z.coerce.number({ invalid_type_error: `${label} must be a number.` }).min(0, `${label} must be 0 or greater.`);
  return integer ? base.int(`${label} must be a whole number.`) : base;
};

const baseRateCardFields = {
  rcType: z.string().trim().min(1, "RC Type is required."),
  mgType: z.string().trim().min(1, "MG Type is required."),
  minimumOrders: numberField("Minimum Orders", { integer: true }),
  maximumOrders: numberField("Maximum Orders", { integer: true }),
  mgAmount: numberField("MG Amount"),
  variablePay: numberField("Variable Amount"),
  weeklyIncentive: numberField("Weekly Incentive").optional(),
  orderIncentive: numberField("Order Incentive").optional(),
};

const ordersRefine = <T extends { minimumOrders: number; maximumOrders: number }>(data: T) =>
  data.maximumOrders >= data.minimumOrders;
const ordersRefineOptions = {
  message: "Maximum Orders must be greater than or equal to Minimum Orders.",
  path: ["maximumOrders"],
};

export const createRateCardFormSchema = z
  .object({
    weekStartDate: z.string().min(1, "Week is required."),
    cityName: z.string().trim().min(1, "City is required."),
    storeName: z.string().trim().min(1, "Store Name is required."),
    storeCode: z.string().trim().min(1, "Store Code is required."),
    ...baseRateCardFields,
  })
  .refine(ordersRefine, ordersRefineOptions);

export type CreateRateCardFormValues = z.infer<typeof createRateCardFormSchema>;

export const editRateCardFormSchema = z
  .object({
    ...baseRateCardFields,
    changeSummary: z.string().trim().min(1, "Describe what changed before saving."),
  })
  .refine(ordersRefine, ordersRefineOptions);

export type EditRateCardFormValues = z.infer<typeof editRateCardFormSchema>;
