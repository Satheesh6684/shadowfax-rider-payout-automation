import { Router } from "express";
import { login, loginSchema, logout, profile } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), login);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/profile", requireAuth, profile);
