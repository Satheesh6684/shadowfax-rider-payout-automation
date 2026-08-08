"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { rateCardsApi } from "@/lib/api/rateCards";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { RateCardCreateForm } from "@/components/rate-card/RateCardCreateForm";
import { CreateRateCardFormValues } from "@/lib/validation/rateCard.schema";

export default function NewRateCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: CreateRateCardFormValues & Record<string, unknown>) {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await rateCardsApi.create(values, token);
      showSuccess(`Rate card created for ${values.storeName}.`);
      router.push("/rate-card");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't create this rate card.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Rate Card</h1>
        <p className="mt-1 text-sm text-muted">
          Add a new store rate card for a week. Existing store codes are auto-detected as you type.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        <RateCardCreateForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/rate-card")}
          isSubmitting={isSubmitting}
          defaultWeekStartDate={searchParams.get("week") ?? undefined}
        />
      </div>
    </div>
  );
}
