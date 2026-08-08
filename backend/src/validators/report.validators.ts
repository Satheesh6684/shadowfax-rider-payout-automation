import { z } from "zod";

export const generateReportSchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});

export const listReportsQuerySchema = z.object({
  weekStartDate: z.string().optional(),
  reportType: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
