import { apiClient } from "@/lib/api-client";
import {
  AuditLogEntry,
  CalculationLog,
  CalculationRun,
  PaginatedResult,
  RiderCalculationResult,
} from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const calculationApi = {
  run: (weekStartDate: string, token: string) =>
    apiClient.post<CalculationRun>("/calculate/run", { weekStartDate }, { token }),

  getSummary: (weekStartDate: string, token: string) =>
    apiClient.get<CalculationRun | null>(`/calculate/summary${toQueryString({ weekStartDate })}`, { token }),

  listRuns: (filters: { weekStartDate?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<CalculationRun>>(`/calculate/runs${toQueryString(filters)}`, { token }),

  listResults: (
    filters: { weekStartDate: string; status?: string; search?: string; page?: number; pageSize?: number },
    token: string
  ) => apiClient.get<PaginatedResult<RiderCalculationResult>>(`/calculate/results${toQueryString(filters)}`, { token }),

  getRiderLogs: (riderId: string, weekStartDate: string, token: string) =>
    apiClient.get<CalculationLog[]>(`/calculate/riders/${riderId}/logs${toQueryString({ weekStartDate })}`, { token }),

  getAuditLogs: (filters: { action?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<AuditLogEntry>>(`/calculate/audit-logs${toQueryString(filters)}`, { token }),
};
