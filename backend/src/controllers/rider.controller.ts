import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { RiderService } from "../services/rider.service";

export const searchRiders = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await RiderService.search(
    { query: q.query, weekStartDate: q.weekStartDate, storeCode: q.storeCode },
    { page: q.page ? Number(q.page) : undefined, pageSize: q.pageSize ? Number(q.pageSize) : undefined }
  );
  res.json({ success: true, data: result });
});

export const getRiderProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await RiderService.getProfile(req.params.riderId);
  res.json({ success: true, data: profile });
});

export const getRiderCalculationHistory = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await RiderService.getCalculationHistory(req.params.riderId, {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

export const getRiderExceptionHistory = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await RiderService.getExceptionHistory(req.params.riderId, {
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.pageSize ? Number(q.pageSize) : undefined,
  });
  res.json({ success: true, data: result });
});

export const getRiderWeekDetail = asyncHandler(async (req: Request, res: Response) => {
  const weekStartDate = req.query.weekStartDate as string;
  const result = await RiderService.getWeekDetail(req.params.riderId, weekStartDate);
  res.json({ success: true, data: result });
});
