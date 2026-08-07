"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { AuthUser } from "@/lib/types";

const TOKEN_STORAGE_KEY = "shadowfax_token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setToken(stored);
    apiClient
      .get<AuthUser>("/auth/profile", { token: stored })
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiClient.post<{ token: string; user: AuthUser }>("/auth/login", { email, password });
    window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      await apiClient.post("/auth/logout", undefined, { token }).catch((err: unknown) => {
        // Logout is best-effort client-side regardless of API outcome —
        // still clear local state even if the audit-log call fails.
        if (!(err instanceof ApiError)) throw err;
      });
    }
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
