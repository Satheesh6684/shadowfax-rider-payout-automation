import { Router } from "express";
import { requireAuth, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createPaymentTypeSchema,
  listPaymentTypesQuerySchema,
  updatePaymentTypeSchema,
  updatePaymentTypeStatusSchema,
} from "../validators/paymentType.validators";
import {
  createPaymentType,
  deletePaymentType,
  getPaymentTypeAuditLogs,
  getPaymentTypeById,
  getPaymentTypeVersionHistory,
  listActivePaymentTypes,
  listPaymentTypes,
  updatePaymentType,
  updatePaymentTypeStatus,
} from "../controllers/paymentType.controller";

export const paymentTypeRouter = Router();

paymentTypeRouter.use(requireAuth);

paymentTypeRouter.get("/active", listActivePaymentTypes);
paymentTypeRouter.get("/audit-logs", getPaymentTypeAuditLogs);

paymentTypeRouter.get("/", validate(listPaymentTypesQuerySchema, "query"), listPaymentTypes);
paymentTypeRouter.post("/", requirePermission("payment_config:write"), validate(createPaymentTypeSchema), createPaymentType);

paymentTypeRouter.get("/:id/history", getPaymentTypeVersionHistory);
paymentTypeRouter.patch("/:id/status", requirePermission("payment_config:write"), validate(updatePaymentTypeStatusSchema), updatePaymentTypeStatus);
paymentTypeRouter.get("/:id", getPaymentTypeById);
paymentTypeRouter.put("/:id", requirePermission("payment_config:write"), validate(updatePaymentTypeSchema), updatePaymentType);
paymentTypeRouter.delete("/:id", requirePermission("payment_config:write"), deletePaymentType);
