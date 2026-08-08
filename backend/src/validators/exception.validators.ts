import { z } from "zod";

export const listExceptionsQuerySchema = z.object({
  weekStartDate: z.string().optional(),
  status: z.enum(["OPEN", "RESOLVED", "IGNORED"]).optional(),
  source: z.enum(["VALIDATION", "CALCULATION"]).optional(),
  category: z.string().optional(),
  riderId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const exceptionSummaryQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const resolveExceptionSchema = z.object({
  notes: z.string().trim().min(1, "A resolution note is required."),
});

export const ignoreExceptionSchema = z.object({
  notes: z.string().trim().min(1, "A note explaining why this is being ignored is required."),
});

export const reprocessSchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});
