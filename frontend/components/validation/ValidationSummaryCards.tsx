import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { ValidationCategory, ValidationIssue, ValidationRun } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  ORDERS: "Orders",
  LOGIN_HOURS: "Rider Login",
  RATE_CARD: "Rate Card",
  VALINOR: "Valinor",
};

function statusFor(errors: number, warnings: number): "PASSED" | "WARNING" | "FAILED" {
  if (errors > 0) return "FAILED";
  if (warnings > 0) return "WARNING";
  return "PASSED";
}

const STATUS_ICON = {
  PASSED: <CheckCircle2 size={16} className="text-success" />,
  WARNING: <AlertTriangle size={16} className="text-warning" />,
  FAILED: <XCircle size={16} className="text-danger" />,
};

const STATUS_TONE = { PASSED: "success", WARNING: "warning", FAILED: "danger" } as const;

interface ValidationSummaryCardsProps {
  run: ValidationRun | null;
  issues: ValidationIssue[];
}

export function ValidationSummaryCards({ run, issues }: ValidationSummaryCardsProps) {
  const categories: ValidationCategory[] = ["ORDERS", "LOGIN_HOURS", "RATE_CARD", "VALINOR"];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <p className="text-xs font-medium text-muted">Overall</p>
        {run ? (
          <>
            <div className="mt-2 flex items-center gap-2">
              {STATUS_ICON[run.status]}
              <Badge tone={STATUS_TONE[run.status]}>{run.status}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted">
              {run.totalErrors} error{run.totalErrors === 1 ? "" : "s"} · {run.totalWarnings} warning
              {run.totalWarnings === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted">Not run yet</p>
        )}
      </div>

      {categories.map((category) => {
        const categoryIssues = issues.filter((i) => i.category === category);
        const errors = categoryIssues.filter((i) => i.severity === "ERROR").length;
        const warnings = categoryIssues.filter((i) => i.severity === "WARNING").length;
        const status = run ? statusFor(errors, warnings) : null;

        return (
          <div key={category} className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <p className="text-xs font-medium text-muted">{CATEGORY_LABELS[category]}</p>
            {status ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  {STATUS_ICON[status]}
                  <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {errors} error{errors === 1 ? "" : "s"} · {warnings} warning{warnings === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-muted">Not run yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
