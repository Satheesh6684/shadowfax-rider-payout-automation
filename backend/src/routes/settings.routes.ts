import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateSettingsSchema } from "../validators/settings.validators";
import { getSettings, getSettingsAuditLogs, updateSettings } from "../controllers/settings.controller";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// Everyone authenticated can READ settings (e.g. frontend needs
// defaultRoundingMode for display); only ADMIN can change them.
settingsRouter.get("/", getSettings);
settingsRouter.get("/audit-logs", requireRole("ADMIN"), getSettingsAuditLogs);
settingsRouter.put("/", requireRole("ADMIN"), validate(updateSettingsSchema), updateSettings);
