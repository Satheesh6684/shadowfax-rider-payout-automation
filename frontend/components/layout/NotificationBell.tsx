"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { notificationsApi } from "@/lib/api/notifications";
import { AppNotification } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const TYPE_DOT = { SUCCESS: "bg-success", ERROR: "bg-danger", INFO: "bg-primary" } as const;

/** The persisted notification center — distinct from Toast (which stays
 * exactly as-is for real-time in-session feedback). This is "what happened
 * while I wasn't looking," polled periodically. */
export function NotificationBell() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadUnreadCount() {
    if (!token) return;
    try {
      const { count } = await notificationsApi.getUnreadCount(token);
      setUnreadCount(count);
    } catch {
      // Non-fatal — the bell just won't show a badge this cycle.
    }
  }

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleOpen() {
    setIsOpen((v) => !v);
    if (!isOpen && token) {
      const result = await notificationsApi.list({ pageSize: 15 }, token);
      setNotifications(result.items);
    }
  }

  async function handleMarkAllRead() {
    if (!token) return;
    await notificationsApi.markAllRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button aria-label="Close" className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-surface shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <CheckCheck size={13} /> Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">Nothing yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`border-b border-border px-4 py-3 last:border-0 ${n.isRead ? "" : "bg-primary-soft/40"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[n.type]}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{n.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                        <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
