import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { paginationQuerySchema, searchRidersQuerySchema, weekDetailQuerySchema } from "../validators/rider.validators";
import {
  getRiderCalculationHistory,
  getRiderExceptionHistory,
  getRiderProfile,
  getRiderWeekDetail,
  searchRiders,
} from "../controllers/rider.controller";

export const riderRouter = Router();

riderRouter.use(requireAuth);

riderRouter.get("/", validate(searchRidersQuerySchema, "query"), searchRiders);
riderRouter.get("/:riderId", getRiderProfile);
riderRouter.get("/:riderId/calculations", validate(paginationQuerySchema, "query"), getRiderCalculationHistory);
riderRouter.get("/:riderId/exceptions", validate(paginationQuerySchema, "query"), getRiderExceptionHistory);
riderRouter.get("/:riderId/week-detail", validate(weekDetailQuerySchema, "query"), getRiderWeekDetail);
