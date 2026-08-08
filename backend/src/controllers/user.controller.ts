import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { UserService } from "../services/user.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "../validators/user.validators";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await UserService.list(
    { role: q.role, status: q.status, search: q.search },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.create(req.body as CreateUserInput, requireActor(req));
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.update(req.params.id, req.body as UpdateUserInput, requireActor(req));
  res.json({ success: true, data: user });
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  const user = await UserService.setStatus(req.params.id, isActive, requireActor(req));
  res.json({ success: true, data: user });
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = req.body as { newPassword: string };
  const result = await UserService.resetPassword(req.params.id, newPassword, requireActor(req));
  res.json({ success: true, data: result });
});

export const changeOwnPassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const result = await UserService.changeOwnPassword(requireActor(req), currentPassword, newPassword);
  res.json({ success: true, data: result });
});

export const getUserLoginHistory = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await UserService.getLoginHistory(req.params.id, {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

export const getUserAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await UserService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
