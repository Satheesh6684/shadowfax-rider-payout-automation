import { apiClient } from "@/lib/api-client";
import {
  AuditLogEntry,
  PaginatedResult,
  ValidationIssue,
  ValidationRun,
  ValidationSummary,
} from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const validationApi = {
  run: (weekStartDate: string, token: string) =>
    apiClient.post<{ run: ValidationRun; issues: ValidationIssue[] }>("/validation/run", { weekStartDate }, { token }),

  getSummary: (weekStartDate: string, token: string) =>
    apiClient.get<ValidationSummary>(`/validation/summary${toQueryString({ weekStartDate })}`, { token }),

  listIssues: (
    runId: string,
    filters: { category?: string; severity?: string; page?: number; pageSize?: number },
    token: string
  ) => apiClient.get<PaginatedResult<ValidationIssue>>(`/validation/runs/${runId}/issues${toQueryString(filters)}`, { token }),

  listRuns: (filters: { weekStartDate?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<ValidationRun>>(`/validation/runs${toQueryString(filters)}`, { token }),

  getAuditLogs: (filters: { action?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<AuditLogEntry>>(`/validation/audit-logs${toQueryString(filters)}`, { token }),
};
