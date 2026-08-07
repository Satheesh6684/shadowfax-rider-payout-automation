import { RateCard, RateCardHistoryEntry } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

interface VersionHistoryTableProps {
  rateCard: RateCard;
  history: RateCardHistoryEntry[];
}

export function VersionHistoryTable({ rateCard, history }: VersionHistoryTableProps) {
  const rows = [
    {
      version: rateCard.version,
      changedBy: rateCard.createdBy,
      changedAt: rateCard.updatedAt,
      changeSummary: history.length === 0 ? "Created" : "Current version",
      isCurrent: true,
      snapshot: {
        rcType: rateCard.rcType,
        mgType: rateCard.mgType,
        minimumOrders: rateCard.minimumOrders,
        maximumOrders: rateCard.maximumOrders,
        mgAmount: rateCard.mgAmount,
        variablePay: rateCard.variablePay,
        weeklyIncentive: rateCard.weeklyIncentive,
        orderIncentive: rateCard.orderIncentive,
      },
    },
    ...history.map((entry) => ({
      version: entry.version,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt,
      changeSummary: entry.changeSummary,
      isCurrent: false,
      snapshot: entry.snapshot,
    })),
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-background/60">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Version</th>
            <th className="px-4 py-3 font-medium text-muted">Changed By</th>
            <th className="px-4 py-3 font-medium text-muted">Date</th>
            <th className="px-4 py-3 font-medium text-muted">Summary</th>
            <th className="px-4 py-3 font-medium text-muted">MG Amount</th>
            <th className="px-4 py-3 font-medium text-muted">Variable</th>
            <th className="px-4 py-3 font-medium text-muted">Min–Max Orders</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.version} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  v{row.version}
                  {row.isCurrent && <Badge tone="primary">Current</Badge>}
                </div>
              </td>
              <td className="px-4 py-3">{row.changedBy}</td>
              <td className="px-4 py-3 text-muted">{formatDateTime(row.changedAt)}</td>
              <td className="px-4 py-3">{row.changeSummary}</td>
              <td className="px-4 py-3">{formatCurrency(row.snapshot.mgAmount)}</td>
              <td className="px-4 py-3">{formatCurrency(row.snapshot.variablePay)}</td>
              <td className="px-4 py-3">
                {row.snapshot.minimumOrders}–{row.snapshot.maximumOrders}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
