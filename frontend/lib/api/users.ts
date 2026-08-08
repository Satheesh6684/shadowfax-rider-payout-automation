import { apiClient } from "@/lib/api-client";
import { LoginHistoryEntry, ManagedUser, PaginatedResult } from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const usersApi = {
  list: (filters: { role?: string; status?: string; search?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<ManagedUser>>(`/users${toQueryString(filters)}`, { token }),

  create: (data: { name: string; email: string; role: string; password: string }, token: string) =>
    apiClient.post<ManagedUser>("/users", data, { token }),

  update: (id: string, data: { name: string; role: string }, token: string) =>
    apiClient.put<ManagedUser>(`/users/${id}`, data, { token }),

  setStatus: (id: string, isActive: boolean, token: string) =>
    apiClient.patch<ManagedUser>(`/users/${id}/status`, { isActive }, { token }),

  resetPassword: (id: string, newPassword: string, token: string) =>
    apiClient.patch<{ success: true }>(`/users/${id}/reset-password`, { newPassword }, { token }),

  changeOwnPassword: (currentPassword: string, newPassword: string, token: string) =>
    apiClient.post<{ success: true }>("/users/change-password", { currentPassword, newPassword }, { token }),

  getLoginHistory: (id: string, page: number, token: string) =>
    apiClient.get<PaginatedResult<LoginHistoryEntry>>(`/users/${id}/login-history${toQueryString({ page, pageSize: 20 })}`, { token }),
};
