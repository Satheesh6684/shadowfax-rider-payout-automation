import { SettingsRepository } from "../repositories/settings.repository";
import { AuditLogService } from "./auditLog.service";
import type { Actor } from "../types/actor";
import type { z } from "zod";
import type { updateSettingsSchema } from "../validators/settings.validators";

const MODULE = "SETTINGS";

export const SettingsService = {
  async get() {
    return SettingsRepository.get();
  },

  async update(input: z.infer<typeof updateSettingsSchema>, actor: Actor) {
    const before = await SettingsRepository.get();
    const updated = await SettingsRepository.update(input, actor.email);

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "SETTINGS_UPDATED",
      oldValue: before,
      newValue: updated,
    });

    return updated;
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
