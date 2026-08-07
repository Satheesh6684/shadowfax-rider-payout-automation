"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  tone: "success" | "error";
}

interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"]) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value: ToastContextValue = {
    showSuccess: (message) => push(message, "success"),
    showError: (message) => push(message, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={[
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-soft",
              toast.tone === "success"
                ? "border-success/20 bg-success-soft text-success"
                : "border-danger/20 bg-danger-soft text-danger",
            ].join(" ")}
          >
            {toast.tone === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span className="text-foreground/90">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
