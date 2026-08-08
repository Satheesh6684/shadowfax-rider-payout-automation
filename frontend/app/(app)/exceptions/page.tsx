"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, History, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { exceptionsApi } from "@/lib/api/exceptions";
import { ExceptionSummary, ExceptionTicket } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ExceptionSummaryCards } from "@/components/exceptions/ExceptionSummaryCards";
import { ExceptionTable } from "@/components/exceptions/ExceptionTable";
import { ResolutionModal } from "@/components/exceptions/ResolutionModal";

const PAGE_SIZE = 25;
const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export default function ExceptionsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const canResolve = usePermission("exceptions:resolve");
  const canRunValidation = usePermission("validation:run");
  const canRunCalculation = usePermission("calculation:run");

  function requireResolvePermission(): boolean {
    if (!canResolve) {
      showError("Your role doesn't have permission to resolve exceptions.");
      return false;
    }
    return true;
  }

  const [weekStartDate, setWeekStartDate] = useState(searchParams.get("week") ?? currentWeekStartIso());
  const [status, setStatus] = useState("OPEN");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<ExceptionSummary | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionTicket[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [modalTarget, setModalTarget] = useState<ExceptionTicket | null>(null);
  const [modalMode, setModalMode] = useState<"resolve" | "ignore">("resolve");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isReprocessingValidation, setIsReprocessingValidation] = useState(false);
  const [isReprocessingCalculation, setIsReprocessingCalculation] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [summaryResult, listResult] = await Promise.all([
        exceptionsApi.getSummary(weekStartDate, token),
        exceptionsApi.list(
          { weekStartDate, status: status || undefined, source: source || undefined, page, pageSize: PAGE_SIZE },
          token
        ),
      ]);
      setSummary(summaryResult);
      setExceptions(listResult.items);
      setTotalPages(listResult.totalPages);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load exceptions.");
    } finally {
      setIsLoading(false);
    }
  }, [token, weekStartDate, status, source, page, showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [weekStartDate, status, source]);

  function openResolve(exc: ExceptionTicket) {
    if (!requireResolvePermission()) return;
    setModalTarget(exc);
    setModalMode("resolve");
  }
  function openIgnore(exc: ExceptionTicket) {
    if (!requireResolvePermission()) return;
    setModalTarget(exc);
    setModalMode("ignore");
  }

  async function handleConfirmResolution(notes: string) {
    if (!modalTarget || !token) return;
    setIsActionLoading(true);
    try {
      if (modalMode === "resolve") {
        await exceptionsApi.resolve(modalTarget.id, notes, token);
        showSuccess("Exception marked resolved.");
      } else {
        await exceptionsApi.ignore(modalTarget.id, notes, token);
        showSuccess("Exception ignored.");
      }
      setModalTarget(null);
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't update this exception.");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleReopen(exc: ExceptionTicket) {
    if (!requireResolvePermission()) return;
    if (!token) return;
    try {
      await exceptionsApi.reopen(exc.id, token);
      showSuccess("Exception reopened.");
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't reopen this exception.");
    }
  }

  async function handleReprocessValidation() {
    if (!canRunValidation) {
      showError("Your role doesn't have permission to run validation.");
      return;
    }
    if (!token) return;
    setIsReprocessingValidation(true);
    try {
      const run = await exceptionsApi.reprocessValidation(weekStartDate, token);
      showSuccess(`Validation re-run: ${run.status} — ${run.totalErrors} error(s), ${run.totalWarnings} warning(s).`);
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't reprocess validation.");
    } finally {
      setIsReprocessingValidation(false);
    }
  }

  async function handleReprocessCalculation() {
    if (!canRunCalculation) {
      showError("Your role doesn't have permission to run calculation.");
      return;
    }
    if (!token) return;
    setIsReprocessingCalculation(true);
    try {
      const run = await exceptionsApi.reprocessCalculation(weekStartDate, token);
      showSuccess(`Calculation re-run: ${run.totalCalculated} calculated, ${run.totalExceptions} exception(s).`);
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't reprocess calculation.");
    } finally {
      setIsReprocessingCalculation(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exception Management</h1>
          <p className="mt-1 text-sm text-muted">
            Everything Validation or Calculation flagged as needing attention, in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push("/exceptions/audit")}>
            <History size={14} /> Audit History
          </Button>
          <Button size="sm" onClick={() => router.push(`/reports?week=${weekStartDate}`)}>
            <FileSpreadsheet size={14} /> Go to Reports
          </Button>
        </div>
      </div>

      <ExceptionSummaryCards summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            className={selectClass}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
            <option value="">All sources</option>
            <option value="VALIDATION">Validation</option>
            <option value="CALCULATION">Calculation</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReprocessValidation} isLoading={isReprocessingValidation} disabled={!canRunValidation}>
            <RefreshCw size={14} /> Reprocess Validation
          </Button>
          <Button variant="secondary" onClick={handleReprocessCalculation} isLoading={isReprocessingCalculation} disabled={!canRunCalculation}>
            <RefreshCw size={14} /> Reprocess Calculation
          </Button>
        </div>
      </div>

      <ExceptionTable
        exceptions={exceptions}
        isLoading={isLoading}
        onResolve={openResolve}
        onIgnore={openIgnore}
        onReopen={handleReopen}
      />

      {totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <ResolutionModal
        isOpen={!!modalTarget}
        onClose={() => setModalTarget(null)}
        exception={modalTarget}
        mode={modalMode}
        onConfirm={handleConfirmResolution}
        isLoading={isActionLoading}
      />
    </div>
  );
}
