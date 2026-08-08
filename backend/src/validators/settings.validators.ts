import { z } from "zod";

export const updateSettingsSchema = z.object({
  organizationName: z.string().trim().min(1).optional(),
  defaultCurrency: z.string().trim().min(1).optional(),
  defaultRoundingPrecision: z.coerce.number().int().min(0).max(4).optional(),
  defaultRoundingMode: z.enum(["HALF_UP", "HALF_DOWN", "CEILING", "FLOOR"]).optional(),
  maxUploadSizeMb: z.coerce.number().int().min(1).max(200).optional(),
  allowedUploadFormats: z.string().trim().min(1).optional(),
  blockCalculationOnValidationFailure: z.boolean().optional(),
  defaultReportFormat: z.enum(["XLSX", "CSV", "PDF"]).optional(),
  notifyOnUploadSuccess: z.boolean().optional(),
  notifyOnUploadFailure: z.boolean().optional(),
  notifyOnValidationComplete: z.boolean().optional(),
  notifyOnCalculationComplete: z.boolean().optional(),
  notifyOnReportGenerated: z.boolean().optional(),
});
