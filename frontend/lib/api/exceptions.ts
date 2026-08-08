import { apiClient } from "@/lib/api-client";
import { AuditLogEntry, CalculationRun, ExceptionSummary, ExceptionTicket, PaginatedResult, ValidationRun } from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const exceptionsApi = {
  list: (
    filters: { weekStartDate?: string; status?: string; source?: string; category?: string; page?: number; pageSize?: number },
    token: string
  ) => apiClient.get<PaginatedResult<ExceptionTicket>>(`/exceptions${toQueryString(filters)}`, { token }),

  getSummary: (weekStartDate: string, token: string) =>
    apiClient.get<ExceptionSummary>(`/exceptions/summary${toQueryString({ weekStartDate })}`, { token }),

  resolve: (id: string, notes: string, token: string) =>
    apiClient.patch<ExceptionTicket>(`/exceptions/${id}/resolve`, { notes }, { token }),

  ignore: (id: string, notes: string, token: string) =>
    apiClient.patch<ExceptionTicket>(`/exceptions/${id}/ignore`, { notes }, { token }),

  reopen: (id: string, token: string) =>
    apiClient.patch<ExceptionTicket>(`/exceptions/${id}/reopen`, undefined, { token }),

  reprocessValidation: (weekStartDate: string, token: string) =>
    apiClient.post<ValidationRun>("/exceptions/reprocess-validation", { weekStartDate }, { token }),

  reprocessCalculation: (weekStartDate: string, token: string) =>
    apiClient.post<CalculationRun>("/exceptions/reprocess-calculation", { weekStartDate }, { token }),

  getAuditLogs: (filters: { action?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<AuditLogEntry>>(`/exceptions/audit-logs${toQueryString(filters)}`, { token }),
};
