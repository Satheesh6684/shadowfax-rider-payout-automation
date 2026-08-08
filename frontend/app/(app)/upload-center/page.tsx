"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Clock3, FileSpreadsheet, History, ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { uploadApi } from "@/lib/api/upload";
import { UploadSummary, UploadType } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { UploadCard } from "@/components/upload-center/UploadCard";
import { UploadHistoryModal } from "@/components/upload-center/UploadHistoryModal";

const CARDS: { type: UploadType; label: string; description: string; icon: typeof ClipboardList }[] = [
  { type: "ORDERS", label: "Orders Data", description: "Completed rider orders for the week", icon: ClipboardList },
  { type: "LOGIN_HOURS", label: "Rider Login Data", description: "Daily login hours per rider", icon: Clock3 },
  { type: "RATE_CARD", label: "Weekly Rate Card", description: "Bulk rate card import (alternative to manual entry)", icon: FileSpreadsheet },
  { type: "VALINOR", label: "Valinor Added Payout", description: "Manually added payouts to reconcile against", icon: Wallet },
];

export default function UploadCenterPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showError } = useToast();

  const [weekStartDate, setWeekStartDate] = useState(currentWeekStartIso());
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyType, setHistoryType] = useState<UploadType | null>(null);

  const loadSummary = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await uploadApi.getSummary(weekStartDate, token);
      setSummary(result);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load upload status.");
    } finally {
      setIsLoading(false);
    }
  }, [token, weekStartDate, showError]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const historyCard = CARDS.find((c) => c.type === historyType);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload Center</h1>
          <p className="mt-1 text-sm text-muted">
            Import Orders, Login Hours, Rate Card, and Valinor data for the selected week.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push("/upload-center/audit")}>
            <History size={14} /> Audit History
          </Button>
          <Button size="sm" onClick={() => router.push("/review-validate")}>
            <ShieldCheck size={14} /> Review & Validate
          </Button>
        </div>
      </div>

      <input
        type="date"
        value={weekStartDate}
        onChange={(e) => setWeekStartDate(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <UploadCard
            key={card.type}
            uploadType={card.type}
            label={card.label}
            description={card.description}
            icon={card.icon}
            batch={isLoading ? null : (summary?.[card.type] ?? null)}
            weekStartDate={weekStartDate}
            onChanged={loadSummary}
            onViewHistory={() => setHistoryType(card.type)}
          />
        ))}
      </div>

      <UploadHistoryModal
        isOpen={!!historyType}
        onClose={() => setHistoryType(null)}
        uploadType={historyType}
        label={historyCard?.label ?? ""}
      />
    </div>
  );
}
