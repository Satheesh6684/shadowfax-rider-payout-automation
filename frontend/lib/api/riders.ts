import { apiClient } from "@/lib/api-client";
import {
  ExceptionTicket,
  PaginatedResult,
  RiderCalculationResult,
  RiderMasterInfo,
  RiderProfile,
  RiderWeekDetail,
} from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const ridersApi = {
  search: (
    filters: { query?: string; weekStartDate?: string; storeCode?: string; page?: number; pageSize?: number },
    token: string
  ) => apiClient.get<PaginatedResult<RiderMasterInfo>>(`/riders${toQueryString(filters)}`, { token }),

  getProfile: (riderId: string, token: string) => apiClient.get<RiderProfile>(`/riders/${riderId}`, { token }),

  getCalculationHistory: (riderId: string, page: number, token: string) =>
    apiClient.get<PaginatedResult<RiderCalculationResult>>(
      `/riders/${riderId}/calculations${toQueryString({ page, pageSize: 20 })}`,
      { token }
    ),

  getExceptionHistory: (riderId: string, page: number, token: string) =>
    apiClient.get<PaginatedResult<ExceptionTicket>>(
      `/riders/${riderId}/exceptions${toQueryString({ page, pageSize: 20 })}`,
      { token }
    ),

  getWeekDetail: (riderId: string, weekStartDate: string, token: string) =>
    apiClient.get<RiderWeekDetail>(`/riders/${riderId}/week-detail${toQueryString({ weekStartDate })}`, { token }),
};
