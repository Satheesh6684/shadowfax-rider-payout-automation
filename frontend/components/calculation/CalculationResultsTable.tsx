"use client";

import { FileText } from "lucide-react";
import { RiderCalculationResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface CalculationResultsTableProps {
  results: RiderCalculationResult[];
  isLoading: boolean;
  onViewLogs: (riderId: string) => void;
}

const STATUS_TONE = { PENDING: "neutral", CALCULATED: "success", EXCEPTION: "danger" } as const;

export function CalculationResultsTable({ results, isLoading, onViewLogs }: CalculationResultsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <TableSkeleton columns={6} />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
        <p className="text-sm font-medium">No calculation results yet.</p>
        <p className="mt-1 text-sm text-muted">Run calculation for this week to see rider-level results here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-background/60">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Rider ID</th>
            <th className="px-4 py-3 font-medium text-muted">Total Eligible</th>
            <th className="px-4 py-3 font-medium text-muted">Actual (Valinor)</th>
            <th className="px-4 py-3 font-medium text-muted">Pending</th>
            <th className="px-4 py-3 font-medium text-muted">Status</th>
            <th className="px-4 py-3 font-medium text-muted">Remarks</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Logs</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background/60">
              <td className="px-4 py-3 font-mono text-xs">{r.riderId}</td>
              <td className="px-4 py-3">{formatCurrency(r.totalEligibleAmount)}</td>
              <td className="px-4 py-3">{formatCurrency(r.actualAmount)}</td>
              <td className="px-4 py-3">{formatCurrency(r.pendingAmount)}</td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-xs text-muted">{r.remarks}</td>
              <td className="px-4 py-3 text-right">
                <button
                  aria-label="View calculation logs"
                  onClick={() => onViewLogs(r.riderId)}
                  className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                >
                  <FileText size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
