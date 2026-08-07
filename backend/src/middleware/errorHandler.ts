import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

const GENERIC_MESSAGE =
  "Something went wrong while processing your request. Please try again, and contact support if the problem continues.";

/**
 * Single point of error handling for the whole API. Route handlers and
 * services should just `throw` — this is the only place that decides what
 * the client sees vs. what gets logged.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.path });
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
    return;
  }

  // Unexpected error — never leak stack traces or raw messages to the client.
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error("Unhandled error", {
    message: error.message,
    stack: error.stack,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    message: GENERIC_MESSAGE,
  });
}

/** Wraps an async route handler so thrown/rejected errors reach errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
