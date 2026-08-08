import * as XLSX from "xlsx";
import { ValidationError } from "./AppError";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

export function assertAllowedFile(fileName: string, sizeBytes: number): void {
  const lower = fileName.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    throw new ValidationError("Unsupported file type. Upload a .csv or .xlsx file.");
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    throw new ValidationError("File is too large. Maximum upload size is 20MB.");
  }
  if (sizeBytes === 0) {
    throw new ValidationError("The uploaded file is empty.");
  }
}

/**
 * Parses a CSV or XLSX buffer into header names + row objects keyed by
 * normalized (lowercased, trimmed) header. Only the first worksheet is read
 * for XLSX files. This is a structural parse only — it does not validate
 * cell values, that's the Validation Engine's job.
 */
export function parseUploadFile(buffer: Buffer, fileName: string): ParsedFile {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  } catch {
    throw new ValidationError(`Unable to read "${fileName}". Please verify the format and try again.`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ValidationError(`"${fileName}" has no worksheet data.`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: "",
  });

  if (rows.length === 0) {
    throw new ValidationError(`"${fileName}" has no data rows.`);
  }

  const rawHeaders = Object.keys(rows[0]);
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());

  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, string> = {};
    rawHeaders.forEach((rawHeader, i) => {
      const value = row[rawHeader];
      normalized[headers[i]] = value === undefined || value === null ? "" : String(value).trim();
    });
    return normalized;
  });

  return { headers, rows: normalizedRows };
}

/**
 * Structural check only: are all required columns present in the header row?
 * Reject-the-whole-file-on-missing-column, per the brief — no partial
 * imports. Deep per-cell validation (dates, negative numbers, duplicates
 * within the file) is the Validation Engine's job, not this one.
 */
export function assertRequiredColumns(headers: string[], required: string[]): void {
  const missing = required.filter((col) => !headers.includes(col.toLowerCase()));
  if (missing.length > 0) {
    throw new ValidationError(
      `The file is missing required column(s): ${missing.join(", ")}.`,
      { missingColumns: missing }
    );
  }
}
