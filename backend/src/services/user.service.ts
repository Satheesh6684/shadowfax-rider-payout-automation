import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/user.repository";
import { AuditLogService } from "./auditLog.service";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../utils/AppError";
import type { Actor } from "../types/actor";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "../validators/user.validators";

const MODULE = "USER_MANAGEMENT";
const SALT_ROUNDS = 10;

function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { id, email, name, role, isActive, mustChangePassword, lastLoginAt, createdAt, updatedAt } = user;
  return { id, email, name, role, isActive, mustChangePassword, lastLoginAt, createdAt, updatedAt };
}

export const UserService = {
  async list(filters: { role?: string; status?: string; search?: string }, pagination: { page?: number; pageSize?: number }) {
    const result = await UserRepository.list(filters, pagination);
    return { ...result, items: result.items.map(toSafeUser) };
  },

  async create(input: CreateUserInput, actor: Actor) {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`A user with email "${input.email}" already exists.`);
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await UserRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      mustChangePassword: true, // admin-set passwords require a change on first login
    });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "USER_CREATED",
      newValue: { email: user.email, role: user.role },
    });

    return toSafeUser(user);
  },

  async update(id: string, input: UpdateUserInput, actor: Actor) {
    const existing = await UserRepository.findById(id);
    if (!existing) throw new NotFoundError("User");

    const updated = await UserRepository.update(id, { name: input.name, role: input.role });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "USER_UPDATED",
      oldValue: { name: existing.name, role: existing.role },
      newValue: { name: updated.name, role: updated.role },
    });

    return toSafeUser(updated);
  },

  async setStatus(id: string, isActive: boolean, actor: Actor) {
    const existing = await UserRepository.findById(id);
    if (!existing) throw new NotFoundError("User");
    if (existing.id === actor.userId && !isActive) {
      throw new ValidationError("You can't deactivate your own account.");
    }

    const updated = await UserRepository.update(id, { isActive });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      oldValue: { isActive: existing.isActive },
      newValue: { isActive: updated.isActive },
    });

    return toSafeUser(updated);
  },

  async resetPassword(id: string, newPassword: string, actor: Actor) {
    const existing = await UserRepository.findById(id);
    if (!existing) throw new NotFoundError("User");

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await UserRepository.update(id, { passwordHash, mustChangePassword: true });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "USER_PASSWORD_RESET",
      newValue: { targetUserId: id },
    });

    return { success: true as const };
  },

  async changeOwnPassword(actor: Actor, currentPassword: string, newPassword: string) {
    const user = await UserRepository.findById(actor.userId);
    if (!user) throw new UnauthorizedError();

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError("Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await UserRepository.update(actor.userId, { passwordHash, mustChangePassword: false });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "PASSWORD_CHANGED",
    });

    return { success: true as const };
  },

  async getLoginHistory(userId: string, pagination: { page?: number; pageSize?: number }) {
    const existing = await UserRepository.findById(userId);
    if (!existing) throw new NotFoundError("User");
    return UserRepository.getLoginHistory(userId, pagination);
  },

  async getAuditLogs(params: {
    action?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }) {
    return AuditLogService.search({ ...params, module: MODULE });
  },
};
