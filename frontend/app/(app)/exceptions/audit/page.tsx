"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { exceptionsApi } from "@/lib/api/exceptions";
import { ApiError } from "@/lib/api-client";
import { AuditLogEntry } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { AuditHistoryTable } from "@/components/shared/AuditHistoryTable";
import { Button } from "@/components/ui/Button";

const PAGE_SIZE = 25;

const ACTIONS = [
  { value: "", label: "All actions" },
  { value: "EXCEPTION_RESOLVED", label: "Resolved" },
  { value: "EXCEPTION_IGNORED", label: "Ignored" },
  { value: "EXCEPTION_REOPENED", label: "Reopened" },
];

const ACTION_LABELS: Record<string, string> = {
  EXCEPTION_RESOLVED: "Resolved",
  EXCEPTION_IGNORED: "Ignored",
  EXCEPTION_REOPENED: "Reopened",
};

const ACTION_TONES: Record<string, "success" | "primary" | "danger" | "warning"> = {
  EXCEPTION_RESOLVED: "success",
  EXCEPTION_IGNORED: "warning",
  EXCEPTION_REOPENED: "primary",
};

export default function ExceptionsAuditPage() {
  const { token } = useAuth();
  const { showError } = useToast();

  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    exceptionsApi
      .getAuditLogs({ action: action || undefined, page, pageSize: PAGE_SIZE }, token)
      .then((result) => {
        setEntries(result.items);
        setTotalPages(result.totalPages);
      })
      .catch((err) => showError(err instanceof ApiError ? err.message : "Couldn't load audit history."))
      .finally(() => setIsLoading(false));
  }, [token, action, page, showError]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit History</h1>
        <p className="mt-1 text-sm text-muted">Every resolve, ignore, and reopen action.</p>
      </div>

      <select
        value={action}
        onChange={(e) => {
          setAction(e.target.value);
          setPage(1);
        }}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {ACTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <AuditHistoryTable entries={entries} isLoading={isLoading} actionLabels={ACTION_LABELS} actionTones={ACTION_TONES} />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
