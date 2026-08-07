import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../utils/AppError";

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
