import { Router } from "express";
import { requireAuth } from "../middleware/auth";
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
paymentTypeRouter.post("/", validate(createPaymentTypeSchema), createPaymentType);

paymentTypeRouter.get("/:id/history", getPaymentTypeVersionHistory);
paymentTypeRouter.patch("/:id/status", validate(updatePaymentTypeStatusSchema), updatePaymentTypeStatus);
paymentTypeRouter.get("/:id", getPaymentTypeById);
paymentTypeRouter.put("/:id", validate(updatePaymentTypeSchema), updatePaymentType);
paymentTypeRouter.delete("/:id", deletePaymentType);
