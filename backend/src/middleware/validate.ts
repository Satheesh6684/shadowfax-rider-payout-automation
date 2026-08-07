import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { ValidationError } from "../utils/AppError";

type RequestPart = "body" | "query" | "params";

/**
 * Central validation entry point (SRS §17). Every route that accepts input
 * should validate through here rather than hand-rolling checks inline, so
 * validation logic stays out of controllers and services.
 *
 * Usage: router.post("/rate-cards", validate(createRateCardSchema), controller)
 */
export function validate(schema: ZodTypeAny, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      next(new ValidationError("Please check the highlighted fields and try again.", details));
      return;
    }

    req[part] = result.data;
    next();
  };
}
