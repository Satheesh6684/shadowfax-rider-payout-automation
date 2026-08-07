"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { rateCardsApi } from "@/lib/api/rateCards";
import { ApiError } from "@/lib/api-client";
import { RateCard } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { RateCardEditForm } from "@/components/rate-card/RateCardEditForm";
import { EditRateCardFormValues } from "@/lib/validation/rateCard.schema";
import { Skeleton } from "@/components/ui/Skeleton";

export default function EditRateCardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();

  const [rateCard, setRateCard] = useState<RateCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    rateCardsApi
      .getById(id, token)
      .then(setRateCard)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load this rate card."))
      .finally(() => setIsLoading(false));
  }, [id, token]);

  async function handleSubmit(values: EditRateCardFormValues) {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await rateCardsApi.update(id, values, token);
      showSuccess("Rate card updated.");
      router.push("/rate-card");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't save these changes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Rate Card</h1>
        <p className="mt-1 text-sm text-muted">Changes are versioned — the previous values stay in history.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        )}
        {loadError && <p className="text-sm text-danger">{loadError}</p>}
        {rateCard && (
          <RateCardEditForm
            rateCard={rateCard}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/rate-card")}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
