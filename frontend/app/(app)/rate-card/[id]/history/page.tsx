"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { rateCardsApi } from "@/lib/api/rateCards";
import { ApiError } from "@/lib/api-client";
import { RateCard, RateCardHistoryEntry } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { VersionHistoryTable } from "@/components/rate-card/VersionHistoryTable";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

export default function RateCardHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { showError } = useToast();

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [history, setHistory] = useState<RateCardHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([rateCardsApi.getById(id, token), rateCardsApi.getVersionHistory(id, token)])
      .then(([rc, hist]) => {
        setRateCard(rc);
        setHistory(hist);
      })
      .catch((err) => showError(err instanceof ApiError ? err.message : "Couldn't load version history."))
      .finally(() => setIsLoading(false));
  }, [id, token, showError]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/rate-card")}>
          <ArrowLeft size={14} /> Back to Rate Cards
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Version History</h1>
        {rateCard && (
          <p className="mt-1 text-sm text-muted">
            {rateCard.store.storeName} ({rateCard.store.storeCode})
          </p>
        )}
      </div>

      {isLoading || !rateCard ? <TableSkeleton /> : <VersionHistoryTable rateCard={rateCard} history={history} />}
    </div>
  );
}
