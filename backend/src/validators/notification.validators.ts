import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  isRead: z.enum(["true", "false"]).optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
