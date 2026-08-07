import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { RateCardService } from "../services/rateCard.service";
import type { Actor } from "../types/actor";
import { MasterDataService } from "../services/masterData.service";
import { UnauthorizedError } from "../utils/AppError";
import type {
  CreateRateCardInput,
  UpdateRateCardInput,
} from "../validators/rateCard.validators";

function requireActor(req: Request): Actor {
  if (!req.user) throw new UnauthorizedError();
  return { userId: req.user.userId, email: req.user.email };
}

export const listRateCards = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await RateCardService.list(
    {
      weekStartDate: q.weekStartDate ? new Date(q.weekStartDate) : undefined,
      city: q.city,
      storeCode: q.storeCode,
      rcType: q.rcType,
      status: q.status,
      search: q.search,
      sortBy: q.sortBy as never,
      sortDir: q.sortDir as never,
    },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const getRateCardsByWeek = asyncHandler(async (req: Request, res: Response) => {
  const rateCards = await RateCardService.getByWeek(req.params.weekStartDate);
  res.json({ success: true, data: rateCards });
});

export const getRateCardById = asyncHandler(async (req: Request, res: Response) => {
  const rateCard = await RateCardService.getById(req.params.id);
  res.json({ success: true, data: rateCard });
});

export const createRateCard = asyncHandler(async (req: Request, res: Response) => {
  const rateCard = await RateCardService.create(req.body as CreateRateCardInput, requireActor(req));
  res.status(201).json({ success: true, data: rateCard });
});

export const updateRateCard = asyncHandler(async (req: Request, res: Response) => {
  const rateCard = await RateCardService.update(
    req.params.id,
    req.body as UpdateRateCardInput,
    requireActor(req)
  );
  res.json({ success: true, data: rateCard });
});

export const deleteRateCard = asyncHandler(async (req: Request, res: Response) => {
  const result = await RateCardService.delete(req.params.id, requireActor(req));
  res.json({ success: true, data: result });
});

export const copyPreviousWeek = asyncHandler(async (req: Request, res: Response) => {
  const { sourceWeekStartDate, targetWeekStartDate } = req.body as {
    sourceWeekStartDate: string;
    targetWeekStartDate: string;
  };
  const result = await RateCardService.copyPreviousWeek(
    sourceWeekStartDate,
    targetWeekStartDate,
    requireActor(req)
  );
  res.status(201).json({ success: true, data: result });
});

export const lockWeek = asyncHandler(async (req: Request, res: Response) => {
  const { weekStartDate } = req.body as { weekStartDate: string };
  const result = await RateCardService.lockWeek(weekStartDate, requireActor(req));
  res.json({ success: true, data: result });
});

export const getVersionHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await RateCardService.getVersionHistory(req.params.id);
  res.json({ success: true, data: history });
});

export const getRateCardAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await RateCardService.getAuditLogs({
    action: q.action,
    userId: q.userId,
    from: q.from ? new Date(q.from) : undefined,
    to: q.to ? new Date(q.to) : undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

export const listCities = asyncHandler(async (_req: Request, res: Response) => {
  const cities = await MasterDataService.listCities();
  res.json({ success: true, data: cities });
});

export const listStores = asyncHandler(async (req: Request, res: Response) => {
  const stores = await MasterDataService.listStores(req.query.city as string | undefined);
  res.json({ success: true, data: stores });
});
