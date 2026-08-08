import { z } from "zod";

export const runCalculationSchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const calculationSummaryQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const listCalculationRunsQuerySchema = z.object({
  weekStartDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const listCalculationResultsQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
  status: z.enum(["PENDING", "CALCULATED", "EXCEPTION"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const riderLogsQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});
