import { AuditLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

interface AuditHistoryTableProps {
  entries: AuditLogEntry[];
  isLoading: boolean;
  actionLabels: Record<string, string>;
  actionTones: Record<string, BadgeTone>;
}

export function AuditHistoryTable({ entries, isLoading, actionLabels, actionTones }: AuditHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <TableSkeleton rows={8} columns={4} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
        <p className="text-sm font-medium">No audit activity yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-background/60">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Action</th>
            <th className="px-4 py-3 font-medium text-muted">User</th>
            <th className="px-4 py-3 font-medium text-muted">Date</th>
            <th className="px-4 py-3 font-medium text-muted">Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0 align-top">
              <td className="px-4 py-3">
                <Badge tone={actionTones[entry.action] ?? "primary"}>
                  {actionLabels[entry.action] ?? entry.action}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{entry.userId ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{formatDateTime(entry.occurredAt)}</td>
              <td className="px-4 py-3">
                <pre className="max-w-md whitespace-pre-wrap break-words font-mono text-xs text-muted">
                  {JSON.stringify(entry.newValue ?? entry.oldValue ?? {}, null, 2)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
