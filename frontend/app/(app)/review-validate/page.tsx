"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, Rocket } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { validationApi } from "@/lib/api/validation";
import { ValidationIssue, ValidationRun } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ValidationSummaryCards } from "@/components/validation/ValidationSummaryCards";
import { ValidationIssuesTable } from "@/components/validation/ValidationIssuesTable";

const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export default function ReviewValidatePage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [weekStartDate, setWeekStartDate] = useState(currentWeekStartIso());
  const [run, setRun] = useState<ValidationRun | null>(null);
  const [canRunCalculation, setCanRunCalculation] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!token) return null;
    try {
      const summary = await validationApi.getSummary(weekStartDate, token);
      setRun(summary.run);
      setCanRunCalculation(summary.canRunCalculation);
      return summary.run;
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load validation status.");
      return null;
    }
  }, [token, weekStartDate, showError]);

  const loadIssues = useCallback(
    async (runId: string) => {
      if (!token) return;
      setIsLoading(true);
      try {
        const result = await validationApi.listIssues(
          runId,
          { category: category || undefined, severity: severity || undefined, pageSize: 200 },
          token
        );
        setIssues(result.items);
      } catch (err) {
        showError(err instanceof ApiError ? err.message : "Couldn't load validation issues.");
      } finally {
        setIsLoading(false);
      }
    },
    [token, category, severity, showError]
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const latestRun = await loadSummary();
      if (latestRun) {
        await loadIssues(latestRun.id);
      } else {
        setIssues([]);
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate]);

  useEffect(() => {
    if (run) loadIssues(run.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, severity]);

  async function handleRunValidation() {
    if (!token) return;
    setIsRunning(true);
    try {
      const result = await validationApi.run(weekStartDate, token);
      setRun(result.run);
      setCanRunCalculation(result.run.status !== "FAILED");
      setIssues(result.issues);
      showSuccess(
        `Validation ${result.run.status === "PASSED" ? "passed" : result.run.status === "WARNING" ? "passed with warnings" : "failed"} — ${result.run.totalErrors} error(s), ${result.run.totalWarnings} warning(s).`
      );
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't run validation.");
    } finally {
      setIsRunning(false);
    }
  }

  function handleRunCalculation() {
    router.push(`/calculation-engine?week=${weekStartDate}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review & Validate</h1>
          <p className="mt-1 text-sm text-muted">
            Run validation against this week&apos;s uploaded data before calculation can proceed.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            className={selectClass}
          />
          <Button onClick={handleRunValidation} isLoading={isRunning}>
            <PlayCircle size={14} /> Run Validation
          </Button>
        </div>
      </div>

      <ValidationSummaryCards run={run} issues={issues} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            <option value="">All categories</option>
            <option value="ORDERS">Orders</option>
            <option value="LOGIN_HOURS">Rider Login</option>
            <option value="RATE_CARD">Rate Card</option>
            <option value="VALINOR">Valinor</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectClass}>
            <option value="">All severities</option>
            <option value="ERROR">Errors</option>
            <option value="WARNING">Warnings</option>
          </select>
        </div>

        <Button onClick={handleRunCalculation} disabled={!canRunCalculation} variant={canRunCalculation ? "primary" : "secondary"}>
          <Rocket size={14} /> Run Calculation
        </Button>
      </div>

      {run?.status === "FAILED" && (
        <p className="text-sm text-danger">
          Validation failed — resolve the errors below and re-run validation before calculation can proceed.
        </p>
      )}

      <ValidationIssuesTable issues={issues} isLoading={isLoading} />
    </div>
  );
}
