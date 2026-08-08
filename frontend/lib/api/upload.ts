import { apiClient, ApiError, API_BASE_URL } from "@/lib/api-client";
import { AuditLogEntry, PaginatedResult, UploadBatch, UploadSummary, UploadType } from "@/lib/types";

function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Uploads via XMLHttpRequest rather than fetch, purely to get real upload
 * progress events (fetch's streaming-upload progress support is still
 * inconsistent across browsers). Response envelope handling mirrors
 * apiClient exactly, so callers get the same ApiError shape either way.
 */
function uploadWithProgress(params: {
  uploadType: UploadType;
  file: File;
  weekStartDate: string;
  replace: boolean;
  token: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadBatch> {
  const { uploadType, file, weekStartDate, replace, token, onProgress } = params;

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("weekStartDate", weekStartDate);
    formData.append("replace", String(replace));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/upload/${uploadType}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let payload: { success?: boolean; data?: UploadBatch; message?: string; details?: unknown } | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
        resolve(payload.data as UploadBatch);
      } else {
        reject(new ApiError(payload?.message ?? "Upload failed. Please try again.", xhr.status, payload?.details));
      }
    };

    xhr.onerror = () => reject(new ApiError("Upload failed — check your connection and try again.", 0));

    xhr.send(formData);
  });
}

export const uploadApi = {
  getSummary: (weekStartDate: string, token: string) =>
    apiClient.get<UploadSummary>(`/upload/summary${toQueryString({ weekStartDate })}`, { token }),

  upload: (params: {
    uploadType: UploadType;
    file: File;
    weekStartDate: string;
    replace: boolean;
    token: string;
    onProgress?: (percent: number) => void;
  }) => uploadWithProgress(params),

  remove: (batchId: string, token: string) => apiClient.delete<UploadBatch>(`/upload/${batchId}`, { token }),

  getHistory: (
    filters: { uploadType?: UploadType; weekStartDate?: string; page?: number; pageSize?: number },
    token: string
  ) => {
    const path = filters.uploadType ? `/upload/${filters.uploadType}/history` : "/upload/history";
    return apiClient.get<PaginatedResult<UploadBatch>>(`${path}${toQueryString(filters)}`, { token });
  },

  getAuditLogs: (filters: { action?: string; page?: number; pageSize?: number }, token: string) =>
    apiClient.get<PaginatedResult<AuditLogEntry>>(`/upload/audit-logs${toQueryString(filters)}`, { token }),
};
