import { z } from "zod";

export const UPLOAD_TYPES = ["ORDERS", "LOGIN_HOURS", "RATE_CARD", "VALINOR"] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

/**
 * Structural requirement only — the column must be present in the file's
 * header row. Whether individual cells are valid (dates, non-negative
 * numbers, no duplicates) is the Validation Engine's job, not this module's.
 */
export const REQUIRED_COLUMNS: Record<UploadType, string[]> = {
  ORDERS: ["date", "order id", "rider id", "store code", "status"],
  LOGIN_HOURS: ["date", "rider id", "store code", "login hours"],
  RATE_CARD: [
    "store code",
    "store name",
    "city",
    "rc type",
    "mg type",
    "minimum orders",
    "maximum orders",
    "mg amount",
    "variable pay",
  ],
  VALINOR: ["date", "rider id", "payment type", "amount", "considered"],
};

export const uploadTypeParamSchema = z.object({
  type: z.enum(UPLOAD_TYPES, { errorMap: () => ({ message: "Unknown upload type." }) }),
});

export const uploadBodySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
  replace: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export const uploadHistoryQuerySchema = z.object({
  weekStartDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const uploadSummaryQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});
