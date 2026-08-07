import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PaymentType, PaymentTypeHistoryEntry } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/validation/paymentType.schema";
import { formatDateTime } from "@/lib/format";

interface PaymentTypeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentType: PaymentType | null;
  history: PaymentTypeHistoryEntry[];
}

export function PaymentTypeHistoryModal({ isOpen, onClose, paymentType, history }: PaymentTypeHistoryModalProps) {
  if (!paymentType) return null;

  const rows = [
    {
      version: paymentType.version,
      changedBy: paymentType.createdBy,
      changedAt: paymentType.updatedAt,
      changeSummary: history.length === 0 ? "Created" : "Current version",
      isCurrent: true,
      priority: paymentType.priority,
      category: paymentType.category,
    },
    ...history.map((entry) => ({
      version: entry.version,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt,
      changeSummary: entry.changeSummary,
      isCurrent: false,
      priority: entry.snapshot.priority,
      category: entry.snapshot.category,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Version History — ${paymentType.name}`} size="lg">
      <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-border bg-background/90">
            <tr>
              <th className="px-3 py-2 font-medium text-muted">Version</th>
              <th className="px-3 py-2 font-medium text-muted">Changed By</th>
              <th className="px-3 py-2 font-medium text-muted">Date</th>
              <th className="px-3 py-2 font-medium text-muted">Summary</th>
              <th className="px-3 py-2 font-medium text-muted">Category</th>
              <th className="px-3 py-2 font-medium text-muted">Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.version} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    v{row.version}
                    {row.isCurrent && <Badge tone="primary">Current</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2">{row.changedBy}</td>
                <td className="px-3 py-2 text-muted">{formatDateTime(row.changedAt)}</td>
                <td className="px-3 py-2">{row.changeSummary}</td>
                <td className="px-3 py-2">{CATEGORY_LABELS[row.category]}</td>
                <td className="px-3 py-2">{row.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
