import { AlertTriangle, XCircle } from "lucide-react";
import { ValidationIssue } from "@/lib/types";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface ValidationIssuesTableProps {
  issues: ValidationIssue[];
  isLoading: boolean;
}

export function ValidationIssuesTable({ issues, isLoading }: ValidationIssuesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
        <p className="text-sm font-medium">No issues found.</p>
        <p className="mt-1 text-sm text-muted">Run validation, or adjust the filters above.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-background/60">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Severity</th>
            <th className="px-4 py-3 font-medium text-muted">Category</th>
            <th className="px-4 py-3 font-medium text-muted">Check</th>
            <th className="px-4 py-3 font-medium text-muted">Message</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                {issue.severity === "ERROR" ? (
                  <span className="flex items-center gap-1.5 text-danger">
                    <XCircle size={14} /> Error
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle size={14} /> Warning
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">{issue.category.replace("_", " ")}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted">{issue.checkName}</td>
              <td className="px-4 py-3">{issue.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
