import { z } from "zod";
import { ROLES } from "../utils/permissions";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().email("Enter a valid email address."),
  role: z.enum(ROLES, { errorMap: () => ({ message: "Select a valid role." }) }),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  role: z.enum(ROLES, { errorMap: () => ({ message: "Select a valid role." }) }),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export const listUsersQuerySchema = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
