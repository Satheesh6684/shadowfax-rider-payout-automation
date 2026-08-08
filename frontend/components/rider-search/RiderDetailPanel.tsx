"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ridersApi } from "@/lib/api/riders";
import { RiderMasterInfo, RiderCalculationResult, ExceptionTicket, RiderWeekDetail } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { exportRiderReport } from "@/lib/riderReportExport";
import { SidePanel } from "@/components/ui/SidePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface RiderDetailPanelProps {
  rider: RiderMasterInfo | null;
  onClose: () => void;
}

type Tab = "calculations" | "exceptions" | "week";

export function RiderDetailPanel({ rider, onClose }: RiderDetailPanelProps) {
  const { token } = useAuth();
  const [activeWeeks, setActiveWeeks] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("calculations");
  const [calcHistory, setCalcHistory] = useState<RiderCalculationResult[]>([]);
  const [exceptionHistory, setExceptionHistory] = useState<ExceptionTicket[]>([]);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [weekDetail, setWeekDetail] = useState<RiderWeekDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!rider || !token) return;
    setTab("calculations");
    ridersApi.getProfile(rider.riderId, token).then((p) => {
      setActiveWeeks(p.activeWeeks);
      if (p.activeWeeks[0]) setSelectedWeek(p.activeWeeks[0].slice(0, 10));
    });
  }, [rider, token]);

  useEffect(() => {
    if (!rider || !token) return;
    setIsLoading(true);
    if (tab === "calculations") {
      ridersApi
        .getCalculationHistory(rider.riderId, 1, token)
        .then((r) => setCalcHistory(r.items))
        .finally(() => setIsLoading(false));
    } else if (tab === "exceptions") {
      ridersApi
        .getExceptionHistory(rider.riderId, 1, token)
        .then((r) => setExceptionHistory(r.items))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [rider, token, tab]);

  useEffect(() => {
    if (!rider || !token || !selectedWeek || tab !== "week") return;
    setIsLoading(true);
    ridersApi
      .getWeekDetail(rider.riderId, selectedWeek, token)
      .then(setWeekDetail)
      .finally(() => setIsLoading(false));
  }, [rider, token, selectedWeek, tab]);

  if (!rider) return null;

  return (
    <SidePanel isOpen={!!rider} onClose={onClose} title={`Rider — ${rider.riderId}`}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="text-sm font-medium">{rider.riderName}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{rider.riderId}</p>
          <p className="mt-1 text-xs text-muted">{activeWeeks.length} active week(s) on record</p>
        </div>

        <div className="flex gap-1 border-b border-border">
          {(["calculations", "exceptions", "week"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-medium capitalize ${
                tab === t ? "border-b-2 border-primary text-primary" : "text-muted"
              }`}
            >
              {t === "week" ? "Week Detail" : t}
            </button>
          ))}
        </div>

        {isLoading && <TableSkeleton rows={4} columns={3} />}

        {!isLoading && tab === "calculations" && (
          <div className="space-y-2">
            {calcHistory.length === 0 ? (
              <p className="text-sm text-muted">No calculation history yet.</p>
            ) : (
              calcHistory.map((h) => (
                <div key={h.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatDate(h.weekStartDate)}</span>
                    <Badge tone={h.status === "CALCULATED" ? "success" : "danger"}>{h.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Eligible {formatCurrency(h.totalEligibleAmount)} · Actual {formatCurrency(h.actualAmount)} ·
                    Pending {formatCurrency(h.pendingAmount)}
                  </p>
                </div>
              ))
            )}
            {calcHistory.length > 0 && (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => exportRiderReport(rider, calcHistory)}>
                <Download size={13} /> Download Rider Report
              </Button>
            )}
          </div>
        )}

        {!isLoading && tab === "exceptions" && (
          <div className="space-y-2">
            {exceptionHistory.length === 0 ? (
              <p className="text-sm text-muted">No exceptions on record.</p>
            ) : (
              exceptionHistory.map((e) => (
                <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{e.checkName}</span>
                    <Badge tone={e.status === "OPEN" ? "danger" : "neutral"}>{e.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{e.message}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(e.lastSeenAt)}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "week" && (
          <div className="space-y-3">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {activeWeeks.map((w) => (
                <option key={w} value={w.slice(0, 10)}>
                  {formatDate(w)}
                </option>
              ))}
            </select>

            {!isLoading && weekDetail && (
              <>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">Orders ({weekDetail.orders.length})</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {weekDetail.orders.map((o) => (
                      <p key={o.orderId} className="text-xs text-muted">
                        {formatDate(o.date)} · {o.storeCode} · {o.status}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">Login Hours ({weekDetail.loginHours.length})</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {weekDetail.loginHours.map((l, i) => (
                      <p key={i} className="text-xs text-muted">
                        {formatDate(l.date)} · {l.storeCode ?? "—"} · {l.loginHours}h
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">Calculation Logs ({weekDetail.calculationLogs.length})</p>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {weekDetail.calculationLogs.map((l) => (
                      <p key={l.id} className="text-xs text-muted">
                        {l.strategyName}: {l.status} {l.amount ? `(${formatCurrency(l.amount)})` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
