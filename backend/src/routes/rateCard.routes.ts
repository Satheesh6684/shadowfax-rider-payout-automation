import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  copyPreviousWeekSchema,
  createRateCardSchema,
  lockWeekSchema,
  listRateCardsQuerySchema,
  updateRateCardSchema,
} from "../validators/rateCard.validators";
import {
  copyPreviousWeek,
  createRateCard,
  deleteRateCard,
  getRateCardAuditLogs,
  getRateCardById,
  getRateCardsByWeek,
  getRecentHistory,
  getVersionHistory,
  listCities,
  listRateCards,
  listStores,
  lockWeek,
  updateRateCard,
} from "../controllers/rateCard.controller";

export const rateCardRouter = Router();

rateCardRouter.use(requireAuth);

// Master data used by the create/edit form's city + store fields.
rateCardRouter.get("/meta/cities", listCities);
rateCardRouter.get("/meta/stores", listStores);

rateCardRouter.get("/audit-logs", getRateCardAuditLogs);
rateCardRouter.get("/history/recent", getRecentHistory);
rateCardRouter.get("/week/:weekStartDate", getRateCardsByWeek);

rateCardRouter.get("/", validate(listRateCardsQuerySchema, "query"), listRateCards);
rateCardRouter.post("/", requirePermission("rate_card:write"), validate(createRateCardSchema), createRateCard);

rateCardRouter.post("/copy-week", requirePermission("rate_card:write"), validate(copyPreviousWeekSchema), copyPreviousWeek);
rateCardRouter.post("/lock-week", requirePermission("rate_card:write"), validate(lockWeekSchema), lockWeek);

rateCardRouter.get("/:id/history", getVersionHistory);
rateCardRouter.get("/:id", getRateCardById);
rateCardRouter.put("/:id", requirePermission("rate_card:write"), validate(updateRateCardSchema), updateRateCard);
rateCardRouter.delete("/:id", requirePermission("rate_card:write"), deleteRateCard);
