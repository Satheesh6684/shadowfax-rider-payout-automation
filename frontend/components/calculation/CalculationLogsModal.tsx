"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { calculationApi } from "@/lib/api/calculation";
import { CalculationLog } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface CalculationLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  riderId: string | null;
  weekStartDate: string;
}

const STATUS_TONE = { CALCULATED: "success", SKIPPED: "neutral", EXCEPTION: "danger" } as const;

export function CalculationLogsModal({ isOpen, onClose, riderId, weekStartDate }: CalculationLogsModalProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<CalculationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !riderId || !token) return;
    setIsLoading(true);
    calculationApi
      .getRiderLogs(riderId, weekStartDate, token)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, riderId, weekStartDate, token]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Calculation Logs — ${riderId ?? ""}`} size="lg">
      {isLoading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : logs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No logs found.</p>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium">{log.strategyName}</span>
                <div className="flex items-center gap-2">
                  {log.amount && <span className="text-xs text-muted">{formatCurrency(log.amount)}</span>}
                  <Badge tone={STATUS_TONE[log.status]}>{log.status}</Badge>
                </div>
              </div>
              {log.message && <p className="mt-1 text-xs text-muted">{log.message}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
