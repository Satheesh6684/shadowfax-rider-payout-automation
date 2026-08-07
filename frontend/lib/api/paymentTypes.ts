import { apiClient } from "@/lib/api-client";
import { AuditLogEntry, PaginatedResult, PaymentType, PaymentTypeHistoryEntry } from "@/lib/types";

export interface PaymentTypeListFilters {
  category?: string;
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

export const paymentTypesApi = {
  list: (filters: PaymentTypeListFilters, token: string) =>
    apiClient.get<PaginatedResult<PaymentType>>(`/payment-types${toQueryString(filters)}`, { token }),

  listActive: (token: string) => apiClient.get<PaymentType[]>("/payment-types/active", { token }),

  getById: (id: string, token: string) => apiClient.get<PaymentType>(`/payment-types/${id}`, { token }),

  create: (
    data: { name: string; category: string; calculationMethod: string; priority: number; description?: string },
    token: string
  ) => apiClient.post<PaymentType>("/payment-types", data, { token }),

  update: (
    id: string,
    data: {
      name: string;
      category: string;
      calculationMethod: string;
      priority: number;
      description?: string;
      changeSummary: string;
    },
    token: string
  ) => apiClient.put<PaymentType>(`/payment-types/${id}`, data, { token }),

  updateStatus: (id: string, status: "ACTIVE" | "INACTIVE", token: string) =>
    apiClient.patch<PaymentType>(`/payment-types/${id}/status`, { status }, { token }),

  delete: (id: string, token: string) =>
    apiClient.delete<{ success: true }>(`/payment-types/${id}`, { token }),

  getVersionHistory: (id: string, token: string) =>
    apiClient.get<PaymentTypeHistoryEntry[]>(`/payment-types/${id}/history`, { token }),

  getAuditLogs: (filters: { action?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<AuditLogEntry>>(`/payment-types/audit-logs${toQueryString(filters)}`, { token }),
};
