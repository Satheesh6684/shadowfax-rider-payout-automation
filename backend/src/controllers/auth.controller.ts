import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { signAuthToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError, UnauthorizedError } from "../utils/AppError";
import { AuditLogService } from "../services/auditLog.service";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Incorrect email or password.");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Incorrect email or password.");
  }

  const token = signAuthToken({ userId: user.id, email: user.email, role: user.role });

  await AuditLogService.record({
    userId: user.id,
    module: "AUTH",
    action: "LOGIN",
  });

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Not logged in.", 400);
  }

  await AuditLogService.record({
    userId: req.user.userId,
    module: "AUTH",
    action: "LOGOUT",
  });

  // JWTs are stateless — logout is a client-side token discard plus an audit
  // trail entry. A denylist/refresh-token table can be added later if
  // server-side revocation becomes a requirement.
  res.json({ success: true, message: "Logged out." });
});

export const profile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) {
    throw new UnauthorizedError();
  }

  res.json({
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
