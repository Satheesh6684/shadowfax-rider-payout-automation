import { apiClient, API_BASE_URL, ApiError } from "@/lib/api-client";
import { GeneratedReport, PaginatedResult } from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const reportsApi = {
  generate: (weekStartDate: string, token: string) =>
    apiClient.post<GeneratedReport>("/reports/generate", { weekStartDate }, { token }),

  list: (filters: { weekStartDate?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<GeneratedReport>>(`/reports${toQueryString(filters)}`, { token }),

  /** Downloads require the Authorization header, so a plain <a href> can't
   * be used — fetch as a blob and trigger the browser's save dialog via a
   * temporary object URL. */
  async download(report: GeneratedReport, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/reports/${report.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new ApiError("Couldn't download this report.", res.status);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
