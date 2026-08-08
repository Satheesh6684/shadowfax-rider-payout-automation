import { z } from "zod";

export const searchRidersQuerySchema = z.object({
  query: z.string().optional(),
  weekStartDate: z.string().optional(),
  storeCode: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const weekDetailQuerySchema = z.object({
  weekStartDate: z.string().min(1, "Week is required."),
});
