import { z } from "zod";

export const runValidationSchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const validationSummaryQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const listIssuesQuerySchema = z.object({
  category: z.enum(["ORDERS", "LOGIN_HOURS", "RATE_CARD", "VALINOR"]).optional(),
  severity: z.enum(["ERROR", "WARNING"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const listRunsQuerySchema = z.object({
  weekStartDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
