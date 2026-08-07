"use client";

import { History, Pencil, PowerOff, Power, Trash2 } from "lucide-react";
import { PaymentType } from "@/lib/types";
import { CATEGORY_LABELS, CALCULATION_METHOD_LABELS } from "@/lib/validation/paymentType.schema";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface PaymentTypeTableProps {
  data: PaymentType[];
  isLoading: boolean;
  onEdit: (paymentType: PaymentType) => void;
  onDelete: (paymentType: PaymentType) => void;
  onViewHistory: (paymentType: PaymentType) => void;
  onToggleStatus: (paymentType: PaymentType) => void;
}

export function PaymentTypeTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onViewHistory,
  onToggleStatus,
}: PaymentTypeTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
        <TableSkeleton columns={6} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
        <p className="text-sm font-medium">No payment types yet.</p>
        <p className="mt-1 text-sm text-muted">Create one to start building the payout catalogue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-border bg-background/60">
          <tr>
            <th className="px-4 py-3 font-medium text-muted">Name</th>
            <th className="px-4 py-3 font-medium text-muted">Category</th>
            <th className="px-4 py-3 font-medium text-muted">Calculation Method</th>
            <th className="px-4 py-3 font-medium text-muted">Priority</th>
            <th className="px-4 py-3 font-medium text-muted">Status</th>
            <th className="px-4 py-3 font-medium text-muted">Version</th>
            <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((pt) => (
            <tr key={pt.id} className="border-b border-border last:border-0 hover:bg-background/60">
              <td className="px-4 py-3">
                <p className="font-medium">{pt.name}</p>
                {pt.description && <p className="text-xs text-muted">{pt.description}</p>}
              </td>
              <td className="px-4 py-3">{CATEGORY_LABELS[pt.category]}</td>
              <td className="px-4 py-3">{CALCULATION_METHOD_LABELS[pt.calculationMethod]}</td>
              <td className="px-4 py-3">{pt.priority}</td>
              <td className="px-4 py-3">
                <Badge tone={pt.status === "ACTIVE" ? "success" : "neutral"}>
                  {pt.status === "ACTIVE" ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs">v{pt.version}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <button
                    aria-label="View history"
                    onClick={() => onViewHistory(pt)}
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                  >
                    <History size={15} />
                  </button>
                  <button
                    aria-label={pt.status === "ACTIVE" ? "Disable" : "Enable"}
                    onClick={() => onToggleStatus(pt)}
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                  >
                    {pt.status === "ACTIVE" ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>
                  <button
                    aria-label="Edit"
                    onClick={() => onEdit(pt)}
                    className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    aria-label="Delete"
                    onClick={() => onDelete(pt)}
                    className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
