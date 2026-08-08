import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { listNotificationsQuerySchema } from "../validators/notification.validators";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get("/unread-count", getUnreadCount);
notificationRouter.get("/", validate(listNotificationsQuerySchema, "query"), listNotifications);
notificationRouter.patch("/:id/read", markNotificationRead);
notificationRouter.patch("/read-all", markAllNotificationsRead);
