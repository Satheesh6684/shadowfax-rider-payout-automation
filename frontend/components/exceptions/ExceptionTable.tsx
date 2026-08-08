"use client";

import { CheckCircle2, EyeOff, RotateCcw } from "lucide-react";
import { ExceptionTicket } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface ExceptionTableProps {
  exceptions: ExceptionTicket[];
  isLoading: boolean;
  onResolve: (exception: ExceptionTicket) => void;
  onIgnore: (exception: ExceptionTicket) => void;
  onReopen: (exception: ExceptionTicket) => void;
}

const STATUS_TONE = { OPEN: "danger", RESOLVED: "success", IGNORED: "neutral" } as const;
const SOURCE_LABEL = { VALIDATION: "Validation", CALCULATION: "Calculation" } as const;

export function ExceptionTable({ exceptions, isLoading, onResolve, onIgnore, onReopen }: ExceptionTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <TableSkeleton columns={7} />
      </div>
    );
  }

  if (exceptions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
        <p className="text-sm font-medium">No exceptions found.</p>
        <p className="mt-1 text-sm text-muted">Run validation or calculation, or adjust the filters above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-border bg-background/60">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Source</th>
            <th className="px-4 py-3 font-medium text-muted">Category</th>
            <th className="px-4 py-3 font-medium text-muted">Check</th>
            <th className="px-4 py-3 font-medium text-muted">Rider</th>
            <th className="px-4 py-3 font-medium text-muted">Message</th>
            <th className="px-4 py-3 font-medium text-muted">Status</th>
            <th className="px-4 py-3 font-medium text-muted">Last Seen</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {exceptions.map((exc) => (
            <tr key={exc.id} className="border-b border-border last:border-0 hover:bg-background/60">
              <td className="px-4 py-3">
                <Badge tone={exc.source === "VALIDATION" ? "primary" : "warning"}>{SOURCE_LABEL[exc.source]}</Badge>
              </td>
              <td className="px-4 py-3 text-muted">{exc.category.replace(/_/g, " ")}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{exc.checkName}</td>
              <td className="px-4 py-3 font-mono text-xs">{exc.riderId ?? "—"}</td>
              <td className="max-w-sm truncate px-4 py-3" title={exc.message}>
                {exc.message}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Badge tone={STATUS_TONE[exc.status]}>{exc.status}</Badge>
                  {exc.occurrenceCount > 1 && <span className="text-xs text-muted">×{exc.occurrenceCount}</span>}
                </div>
              </td>
              <td className="px-4 py-3 text-muted">{formatDateTime(exc.lastSeenAt)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  {exc.status === "OPEN" && (
                    <>
                      <button
                        aria-label="Resolve"
                        onClick={() => onResolve(exc)}
                        className="rounded-md p-1.5 text-muted hover:bg-success-soft hover:text-success"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                      <button
                        aria-label="Ignore"
                        onClick={() => onIgnore(exc)}
                        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                      >
                        <EyeOff size={15} />
                      </button>
                    </>
                  )}
                  {exc.status !== "OPEN" && (
                    <button
                      aria-label="Reopen"
                      onClick={() => onReopen(exc)}
                      className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
