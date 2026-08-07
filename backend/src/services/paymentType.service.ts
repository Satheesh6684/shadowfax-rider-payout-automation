import { PaymentTypeFilters, PaymentTypeRepository } from "../repositories/paymentType.repository";
import { PaginationParams } from "../utils/pagination";
import { AuditLogService } from "./auditLog.service";
import { ConflictError, NotFoundError } from "../utils/AppError";
import type { Actor } from "../types/actor";
import type {
  CreatePaymentTypeInput,
  UpdatePaymentTypeInput,
  UpdatePaymentTypeStatusInput,
} from "../validators/paymentType.validators";

const MODULE = "PAYMENT_CONFIGURATION";

function toSnapshot(paymentType: {
  name: string;
  category: string;
  calculationMethod: string;
  priority: number;
  status: string;
  description: string | null;
  version: number;
}) {
  return {
    name: paymentType.name,
    category: paymentType.category,
    calculationMethod: paymentType.calculationMethod,
    priority: paymentType.priority,
    status: paymentType.status,
    description: paymentType.description,
    version: paymentType.version,
  };
}

export const PaymentTypeService = {
  async list(filters: PaymentTypeFilters, pagination: PaginationParams) {
    return PaymentTypeRepository.list(filters, pagination);
  },

  async listActive() {
    return PaymentTypeRepository.listActive();
  },

  async getById(id: string) {
    const paymentType = await PaymentTypeRepository.findById(id);
    if (!paymentType || paymentType.status === "DELETED") {
      throw new NotFoundError("Payment type");
    }
    return paymentType;
  },

  async create(input: CreatePaymentTypeInput, actor: Actor) {
    const existing = await PaymentTypeRepository.findByName(input.name);
    if (existing && existing.status !== "DELETED") {
      throw new ConflictError(`A payment type named "${input.name}" already exists.`);
    }

    const data = {
      name: input.name,
      category: input.category,
      calculationMethod: input.calculationMethod,
      priority: input.priority,
      description: input.description ?? null,
      status: "ACTIVE",
      version: 1,
      createdBy: actor.email,
    };

    // Reviving a previously-deleted name keeps the same row (and its
    // history trail) rather than colliding on the unique `name` constraint.
    const paymentType = existing
      ? await PaymentTypeRepository.update(existing.id, data)
      : await PaymentTypeRepository.create(data);

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: existing ? "PAYMENT_TYPE_RECREATED" : "PAYMENT_TYPE_CREATED",
      newValue: toSnapshot(paymentType),
    });

    return paymentType;
  },

  async update(id: string, input: UpdatePaymentTypeInput, actor: Actor) {
    const existing = await PaymentTypeRepository.findById(id);
    if (!existing || existing.status === "DELETED") {
      throw new NotFoundError("Payment type");
    }

    if (input.name !== existing.name) {
      const nameConflict = await PaymentTypeRepository.findByName(input.name);
      if (nameConflict && nameConflict.id !== id && nameConflict.status !== "DELETED") {
        throw new ConflictError(`A payment type named "${input.name}" already exists.`);
      }
    }

    await PaymentTypeRepository.recordHistory({
      paymentTypeId: id,
      version: existing.version,
      changeSummary: input.changeSummary,
      changedBy: actor.email,
      snapshot: toSnapshot(existing),
    });

    const updated = await PaymentTypeRepository.update(id, {
      name: input.name,
      category: input.category,
      calculationMethod: input.calculationMethod,
      priority: input.priority,
      description: input.description ?? null,
      version: existing.version + 1,
    });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "PAYMENT_TYPE_UPDATED",
      oldValue: toSnapshot(existing),
      newValue: toSnapshot(updated),
    });

    return updated;
  },

  async updateStatus(id: string, input: UpdatePaymentTypeStatusInput, actor: Actor) {
    const existing = await PaymentTypeRepository.findById(id);
    if (!existing || existing.status === "DELETED") {
      throw new NotFoundError("Payment type");
    }
    if (existing.status === input.status) {
      return existing;
    }

    const updated = await PaymentTypeRepository.update(id, { status: input.status });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: input.status === "ACTIVE" ? "PAYMENT_TYPE_ENABLED" : "PAYMENT_TYPE_DISABLED",
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    return updated;
  },

  async delete(id: string, actor: Actor) {
    const existing = await PaymentTypeRepository.findById(id);
    if (!existing || existing.status === "DELETED") {
      throw new NotFoundError("Payment type");
    }

    await PaymentTypeRepository.recordHistory({
      paymentTypeId: id,
      version: existing.version,
      changeSummary: "Deleted",
      changedBy: actor.email,
      snapshot: toSnapshot(existing),
    });

    await PaymentTypeRepository.update(id, { status: "DELETED" });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "PAYMENT_TYPE_DELETED",
      oldValue: toSnapshot(existing),
    });

    return { success: true as const };
  },

  async getVersionHistory(id: string) {
    const paymentType = await PaymentTypeRepository.findById(id);
    if (!paymentType) {
      throw new NotFoundError("Payment type");
    }
    return PaymentTypeRepository.getHistory(id);
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
