"use client";

import { Building2, FileSpreadsheet, Gauge, Gift, History, Sparkles, TrendingUp } from "lucide-react";
import { RateCard } from "@/lib/types";
import { formatCurrency, formatWeekRange } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SidePanel } from "@/components/ui/SidePanel";
import { DetailSection } from "./DetailSection";

interface StoreDetailsPanelProps {
  rateCard: RateCard | null;
  onClose: () => void;
  onEdit: () => void;
  onViewFullHistory: () => void;
  canWrite?: boolean;
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function slabRows(rateCard: RateCard) {
  const o = [rateCard.o1, rateCard.o2, rateCard.o3, rateCard.o4, rateCard.o5, rateCard.o6, rateCard.o7];
  const mg = [rateCard.mg1, rateCard.mg2, rateCard.mg3, rateCard.mg4, rateCard.mg5, rateCard.mg6, rateCard.mg7];
  const v = [rateCard.var1, rateCard.var2, rateCard.var3, rateCard.var4, rateCard.var5, rateCard.var6, rateCard.var7];
  const rows: { upTo: number; mg: string | null; variable: string | null }[] = [];
  for (let i = 0; i < 7; i++) {
    if (o[i] === null) continue;
    rows.push({ upTo: o[i] as number, mg: mg[i], variable: v[i] });
  }
  return rows;
}

export function StoreDetailsPanel({ rateCard, onClose, onEdit, onViewFullHistory, canWrite = true }: StoreDetailsPanelProps) {
  if (!rateCard) return null;
  const slabs = slabRows(rateCard);

  return (
    <SidePanel isOpen={!!rateCard} onClose={onClose} title="Store Details">
      <DetailSection icon={Building2} iconTone="bg-primary-soft text-primary" title="Store Information">
        <FieldRow label="Store Code" value={<span className="font-mono">{rateCard.store.storeCode}</span>} />
        <FieldRow label="Store Name" value={rateCard.store.storeName} />
        <FieldRow label="City" value={rateCard.store.city.name} />
        <FieldRow label="Status" value={<StatusBadge status={rateCard.status} />} />
        <FieldRow label="Week" value={formatWeekRange(rateCard.weekStartDate, rateCard.weekEndDate)} />
      </DetailSection>

      <DetailSection icon={FileSpreadsheet} iconTone="bg-warning-soft text-warning" title="Rate Card">
        <FieldRow label="RC Type" value={rateCard.rcType} />
        <FieldRow label="MG Type" value={rateCard.mgType} />
        <FieldRow label="Version" value={`v${rateCard.version}`} />
      </DetailSection>

      <DetailSection icon={Gauge} iconTone="bg-success-soft text-success" title="MG Configuration">
        <FieldRow label="Minimum Orders" value={rateCard.minimumOrders} />
        <FieldRow label="Maximum Orders" value={rateCard.maximumOrders} />
        <FieldRow label="MG Amount" value={formatCurrency(rateCard.mgAmount)} />
        <FieldRow
          label="Minimum Login Hours"
          value={rateCard.minimumLoginHours ? `${rateCard.minimumLoginHours}h` : "Not configured"}
        />
        {slabs.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-muted">Up to Orders</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted">MG</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted">Variable</th>
                </tr>
              </thead>
              <tbody>
                {slabs.map((s, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1.5">{s.upTo}</td>
                    <td className="px-2 py-1.5">{s.mg ? formatCurrency(s.mg) : "—"}</td>
                    <td className="px-2 py-1.5">{s.variable ? formatCurrency(s.variable) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted">No slabs configured — MG/Variable can&apos;t be calculated yet.</p>
        )}
      </DetailSection>

      <DetailSection icon={TrendingUp} iconTone="bg-primary-soft text-primary" title="Variable Pay" defaultOpen={false}>
        <FieldRow label="Base Variable Pay" value={formatCurrency(rateCard.variablePay)} />
        <p className="text-xs text-muted">Per-order slab rates are shown in the MG Configuration table above.</p>
      </DetailSection>

      <DetailSection icon={Gift} iconTone="bg-warning-soft text-warning" title="Weekly Incentive" defaultOpen={false}>
        <FieldRow label="Weekly Incentive" value={formatCurrency(rateCard.weeklyIncentive)} />
        <FieldRow label="Order Incentive" value={formatCurrency(rateCard.orderIncentive)} />
      </DetailSection>

      <DetailSection icon={Sparkles} iconTone="bg-danger-soft text-danger" title="Special Incentives" defaultOpen={false}>
        <p className="text-xs text-muted">No special incentives configured for this store.</p>
      </DetailSection>

      <DetailSection icon={History} iconTone="bg-success-soft text-success" title="Version History" defaultOpen={false}>
        <FieldRow label="Current Version" value={`v${rateCard.version}`} />
        <FieldRow label="Last Updated" value={rateCard.updatedAt.slice(0, 10)} />
        <Button variant="secondary" size="sm" onClick={onViewFullHistory} className="w-full">
          View Full History
        </Button>
      </DetailSection>

      <div className="sticky bottom-0 -mx-5 mt-4 border-t border-border bg-surface px-5 py-3">
        <Button onClick={onEdit} disabled={rateCard.status === "LOCKED" || !canWrite} className="w-full">
          Edit Rate Card
        </Button>
      </div>
    </SidePanel>
  );
}
