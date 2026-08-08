import { ExceptionRepository } from "../repositories/exception.repository";
import { AuditLogService } from "./auditLog.service";
import { parseWeekStart } from "../utils/week";
import { NotFoundError, ValidationError } from "../utils/AppError";
import type { Actor } from "../types/actor";

const MODULE = "EXCEPTION_MANAGEMENT";

export const ExceptionService = {
  async list(
    filters: { weekStartDate?: string; status?: string; source?: string; category?: string; riderId?: string },
    pagination: { page?: number; pageSize?: number }
  ) {
    return ExceptionRepository.list(
      {
        weekStartDate: filters.weekStartDate ? parseWeekStart(filters.weekStartDate) : undefined,
        status: filters.status,
        source: filters.source,
        category: filters.category,
        riderId: filters.riderId,
      },
      pagination
    );
  },

  async getSummary(weekStartDateInput: string) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    return ExceptionRepository.getSummary(weekStartDate);
  },

  async resolve(id: string, notes: string, actor: Actor) {
    const exception = await ExceptionRepository.findById(id);
    if (!exception) throw new NotFoundError("Exception");
    if (exception.status === "RESOLVED") throw new ValidationError("This exception is already resolved.");

    const updated = await ExceptionRepository.resolve(id, actor.email, notes);

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "EXCEPTION_RESOLVED",
      oldValue: { status: exception.status },
      newValue: { status: updated.status, resolutionNotes: notes },
    });

    return updated;
  },

  async ignore(id: string, notes: string, actor: Actor) {
    const exception = await ExceptionRepository.findById(id);
    if (!exception) throw new NotFoundError("Exception");

    const updated = await ExceptionRepository.ignore(id, actor.email, notes);

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "EXCEPTION_IGNORED",
      oldValue: { status: exception.status },
      newValue: { status: updated.status, resolutionNotes: notes },
    });

    return updated;
  },

  async reopen(id: string, actor: Actor) {
    const exception = await ExceptionRepository.findById(id);
    if (!exception) throw new NotFoundError("Exception");

    const updated = await ExceptionRepository.reopen(id);

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "EXCEPTION_REOPENED",
      oldValue: { status: exception.status },
      newValue: { status: updated.status },
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
