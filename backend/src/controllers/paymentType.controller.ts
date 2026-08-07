import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { PaymentTypeService } from "../services/paymentType.service";
import { UnauthorizedError } from "../utils/AppError";
import type { Actor } from "../types/actor";
import type {
  CreatePaymentTypeInput,
  UpdatePaymentTypeInput,
  UpdatePaymentTypeStatusInput,
} from "../validators/paymentType.validators";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const listPaymentTypes = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await PaymentTypeService.list(
    {
      category: q.category,
      status: q.status,
      search: q.search,
      sortBy: q.sortBy as never,
      sortDir: q.sortDir as never,
    },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const listActivePaymentTypes = asyncHandler(async (_req: Request, res: Response) => {
  const paymentTypes = await PaymentTypeService.listActive();
  res.json({ success: true, data: paymentTypes });
});

export const getPaymentTypeById = asyncHandler(async (req: Request, res: Response) => {
  const paymentType = await PaymentTypeService.getById(req.params.id);
  res.json({ success: true, data: paymentType });
});

export const createPaymentType = asyncHandler(async (req: Request, res: Response) => {
  const paymentType = await PaymentTypeService.create(req.body as CreatePaymentTypeInput, requireActor(req));
  res.status(201).json({ success: true, data: paymentType });
});

export const updatePaymentType = asyncHandler(async (req: Request, res: Response) => {
  const paymentType = await PaymentTypeService.update(
    req.params.id,
    req.body as UpdatePaymentTypeInput,
    requireActor(req)
  );
  res.json({ success: true, data: paymentType });
});

export const updatePaymentTypeStatus = asyncHandler(async (req: Request, res: Response) => {
  const paymentType = await PaymentTypeService.updateStatus(
    req.params.id,
    req.body as UpdatePaymentTypeStatusInput,
    requireActor(req)
  );
  res.json({ success: true, data: paymentType });
});

export const deletePaymentType = asyncHandler(async (req: Request, res: Response) => {
  const result = await PaymentTypeService.delete(req.params.id, requireActor(req));
  res.json({ success: true, data: result });
});

export const getPaymentTypeVersionHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await PaymentTypeService.getVersionHistory(req.params.id);
  res.json({ success: true, data: history });
});

export const getPaymentTypeAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await PaymentTypeService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});
