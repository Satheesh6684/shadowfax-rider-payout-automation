import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError, ForbiddenError } from "../utils/AppError";
import { Permission, roleHasPermission } from "../utils/permissions";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Requires a valid bearer token. Phase 1 has one role (ADMIN); the payload
 * already carries `role` so a future requireRole(...) middleware can be
 * added without touching this file or any existing route.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError("Your session has expired. Please log in again."));
  }
}

export function signAuthToken(payload: AuthPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtSecret, options);
}

/**
 * Requires the authenticated user's role to carry a specific permission,
 * per the matrix in utils/permissions.ts. Always used AFTER requireAuth
 * (needs req.user to already be populated) — e.g.
 * `router.delete("/:id", requireAuth, requirePermission("rate_card:write"), handler)`.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roleHasPermission(req.user.role, permission)) {
      next(new ForbiddenError(`Your role (${req.user.role}) doesn't have permission to do that.`));
      return;
    }
    next();
  };
}

/** Requires one of a specific set of roles — used sparingly, for actions
 * (like User Management) that are role-gated rather than permission-gated. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError(`This action requires one of these roles: ${roles.join(", ")}.`));
      return;
    }
    next();
  };
}
