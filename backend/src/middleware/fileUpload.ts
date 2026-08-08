import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { MAX_UPLOAD_BYTES } from "../utils/fileParser";
import { ValidationError } from "../utils/AppError";

/**
 * Memory storage: the file exists only as a Buffer in this request's
 * memory, for the duration of parsing — never persisted to disk, cleaned up
 * automatically when the request completes. This satisfies "temporary file
 * storage" more literally than writing to a temp directory and remembering
 * to delete it: there's nothing to forget to clean up.
 */
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
}).single("file");

/**
 * Multer reports its own errors (file too large, wrong field name) via a
 * callback rather than throwing into Express's normal middleware chain.
 * This adapts that into our existing ValidationError -> errorHandler flow
 * instead of special-casing MulterError inside the centralized handler.
 */
export function uploadFileMiddleware(req: Request, res: Response, next: NextFunction): void {
  multerUpload(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      next(new ValidationError("File is too large. Maximum upload size is 20MB."));
      return;
    }
    next(new ValidationError("Unable to upload this file. Please try again."));
  });
}
