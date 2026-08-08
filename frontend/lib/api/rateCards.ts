import { apiClient } from "@/lib/api-client";
import {
  AuditLogEntry,
  City,
  PaginatedResult,
  RateCard,
  RateCardFormValues,
  RateCardHistoryEntry,
  RecentHistoryEntry,
  Store,
} from "@/lib/types";

export interface RateCardListFilters {
  weekStartDate?: string;
  city?: string;
  storeCode?: string;
  rcType?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const rateCardsApi = {
  list: (filters: RateCardListFilters, token: string) =>
    apiClient.get<PaginatedResult<RateCard>>(`/rate-cards${toQueryString(filters)}`, { token }),

  getByWeek: (weekStartDate: string, token: string) =>
    apiClient.get<RateCard[]>(`/rate-cards/week/${weekStartDate}`, { token }),

  getById: (id: string, token: string) => apiClient.get<RateCard>(`/rate-cards/${id}`, { token }),

  create: (data: RateCardFormValues & { weekStartDate: string } & Record<string, unknown>, token: string) =>
    apiClient.post<RateCard>("/rate-cards", data, { token }),

  update: (
    id: string,
    data: Omit<RateCardFormValues, "cityName" | "storeName" | "storeCode"> & { changeSummary: string } & Record<string, unknown>,
    token: string
  ) => apiClient.put<RateCard>(`/rate-cards/${id}`, data, { token }),

  delete: (id: string, token: string) =>
    apiClient.delete<{ success: true }>(`/rate-cards/${id}`, { token }),

  copyPreviousWeek: (sourceWeekStartDate: string, targetWeekStartDate: string, token: string) =>
    apiClient.post<{ recordsCopied: number; targetWeekStartDate: string }>(
      "/rate-cards/copy-week",
      { sourceWeekStartDate, targetWeekStartDate },
      { token }
    ),

  lockWeek: (weekStartDate: string, token: string) =>
    apiClient.post<{ success: true; recordsLocked: number }>("/rate-cards/lock-week", { weekStartDate }, { token }),

  getVersionHistory: (id: string, token: string) =>
    apiClient.get<RateCardHistoryEntry[]>(`/rate-cards/${id}/history`, { token }),

  getRecentHistory: (weekStartDate: string, limit: number, token: string) =>
    apiClient.get<RecentHistoryEntry[]>(`/rate-cards/history/recent${toQueryString({ weekStartDate, limit })}`, { token }),

  getAuditLogs: (
    filters: { action?: string; page?: number; pageSize?: number },
    token: string
  ) => apiClient.get<PaginatedResult<AuditLogEntry>>(`/rate-cards/audit-logs${toQueryString(filters)}`, { token }),

  listCities: (token: string) => apiClient.get<City[]>("/rate-cards/meta/cities", { token }),

  listStores: (city: string | undefined, token: string) =>
    apiClient.get<Store[]>(`/rate-cards/meta/stores${toQueryString({ city })}`, { token }),
};
