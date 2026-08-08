import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  changePasswordSchema,
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from "../validators/user.validators";
import {
  changeOwnPassword,
  createUser,
  getUserAuditLogs,
  getUserLoginHistory,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from "../controllers/user.controller";

export const userRouter = Router();

userRouter.use(requireAuth);

// Changing your OWN password only requires being logged in, not the
// ADMIN-only gate below (every role must be able to change their own password).
userRouter.post("/change-password", validate(changePasswordSchema), changeOwnPassword);

// Everything else here is User Management proper — ADMIN only.
userRouter.use(requireRole("ADMIN"));

userRouter.get("/audit-logs", getUserAuditLogs);
userRouter.get("/", validate(listUsersQuerySchema, "query"), listUsers);
userRouter.post("/", validate(createUserSchema), createUser);
userRouter.put("/:id", validate(updateUserSchema), updateUser);
userRouter.patch("/:id/status", validate(updateUserStatusSchema), setUserStatus);
userRouter.patch("/:id/reset-password", validate(resetPasswordSchema), resetUserPassword);
userRouter.get("/:id/login-history", getUserLoginHistory);
