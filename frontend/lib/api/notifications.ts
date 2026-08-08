import { apiClient } from "@/lib/api-client";
import { AppNotification, PaginatedResult } from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const notificationsApi = {
  list: (filters: { isRead?: boolean; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<AppNotification>>(`/notifications${toQueryString(filters)}`, { token }),

  getUnreadCount: (token: string) => apiClient.get<{ count: number }>("/notifications/unread-count", { token }),

  markRead: (id: string, token: string) =>
    apiClient.patch<AppNotification>(`/notifications/${id}/read`, undefined, { token }),

  markAllRead: (token: string) => apiClient.patch<{ count: number }>("/notifications/read-all", undefined, { token }),
};
