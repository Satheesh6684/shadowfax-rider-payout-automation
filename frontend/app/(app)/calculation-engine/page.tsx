"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, PlayCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { calculationApi } from "@/lib/api/calculation";
import { validationApi } from "@/lib/api/validation";
import { CalculationRun, RiderCalculationResult } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CalculationResultsTable } from "@/components/calculation/CalculationResultsTable";
import { CalculationLogsModal } from "@/components/calculation/CalculationLogsModal";

const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export default function CalculationEnginePage() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [weekStartDate, setWeekStartDate] = useState(searchParams.get("week") ?? currentWeekStartIso());
  const [run, setRun] = useState<CalculationRun | null>(null);
  const [canRun, setCanRun] = useState(false);
  const [results, setResults] = useState<RiderCalculationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [logsRiderId, setLogsRiderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [validationSummary, calcRun] = await Promise.all([
        validationApi.getSummary(weekStartDate, token),
        calculationApi.getSummary(weekStartDate, token),
      ]);
      setCanRun(validationSummary.canRunCalculation);
      setRun(calcRun);

      if (calcRun) {
        const resultsPage = await calculationApi.listResults({ weekStartDate, pageSize: 100 }, token);
        setResults(resultsPage.items);
      } else {
        setResults([]);
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load calculation status.");
    } finally {
      setIsLoading(false);
    }
  }, [token, weekStartDate, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRun() {
    if (!token) return;
    setIsRunning(true);
    try {
      const newRun = await calculationApi.run(weekStartDate, token);
      showSuccess(
        `Calculation ${newRun.status === "COMPLETED" ? "completed" : newRun.status === "COMPLETED_WITH_EXCEPTIONS" ? "completed with exceptions" : "failed"} — ${newRun.totalCalculated} calculated, ${newRun.totalExceptions} exception(s).`
      );
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't run calculation.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calculation Engine</h1>
          <p className="mt-1 text-sm text-muted">
            Resolves each rider&apos;s store, rate card, and Valinor payments — payout formulas (MG, Variable, F+V,
            and incentive strategies) are not yet configured, so results currently report as exceptions by design.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            className={selectClass}
          />
          <Button onClick={handleRun} isLoading={isRunning} disabled={!canRun}>
            <PlayCircle size={14} /> Run Calculation
          </Button>
        </div>
      </div>

      {!canRun && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle size={16} />
          Validation hasn&apos;t passed for this week yet.{" "}
          <button className="underline" onClick={() => router.push("/review-validate")}>
            Go to Review & Validate
          </button>
        </div>
      )}

      {run && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-medium text-muted">Status</p>
            <div className="mt-2">
              <Badge tone={run.status === "COMPLETED" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>
                {run.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-medium text-muted">Total Riders</p>
            <p className="mt-2 text-lg font-semibold">{run.totalRiders}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-medium text-muted">Calculated</p>
            <p className="mt-2 text-lg font-semibold text-success">{run.totalCalculated}</p>
          </div>
          <button
            onClick={() => router.push(`/exceptions?week=${weekStartDate}`)}
            className="rounded-xl border border-border bg-surface p-4 text-left shadow-soft transition-colors hover:border-danger/40"
          >
            <p className="text-xs font-medium text-muted">Exceptions</p>
            <p className="mt-2 text-lg font-semibold text-danger">{run.totalExceptions}</p>
            {run.totalExceptions > 0 && <p className="mt-1 text-xs text-danger underline">Review exceptions →</p>}
          </button>
        </div>
      )}

      <CalculationResultsTable results={results} isLoading={isLoading} onViewLogs={setLogsRiderId} />

      <CalculationLogsModal
        isOpen={!!logsRiderId}
        onClose={() => setLogsRiderId(null)}
        riderId={logsRiderId}
        weekStartDate={weekStartDate}
      />
    </div>
  );
}
