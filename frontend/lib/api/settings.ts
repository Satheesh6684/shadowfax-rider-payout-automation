import { apiClient } from "@/lib/api-client";
import { AppSettings } from "@/lib/types";

export const settingsApi = {
  get: (token: string) => apiClient.get<AppSettings>("/settings", { token }),
  update: (data: Partial<AppSettings>, token: string) => apiClient.put<AppSettings>("/settings", data, { token }),
};
