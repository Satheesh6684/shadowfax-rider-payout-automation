"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditRateCardFormValues, editRateCardFormSchema } from "@/lib/validation/rateCard.schema";
import { RateCard, SlabRow } from "@/lib/types";
import { formatWeekRange } from "@/lib/format";
import { slabsToFields, fieldsToSlabRows } from "@/lib/calculation/slabs";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, NumberField, TextField } from "./FormFields";
import { SlabEditor } from "./SlabEditor";

interface RateCardEditFormProps {
  rateCard: RateCard;
  onSubmit: (values: EditRateCardFormValues & Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function RateCardEditForm({ rateCard, onSubmit, onCancel, isSubmitting }: RateCardEditFormProps) {
  const [slabs, setSlabs] = useState<SlabRow[]>(() => fieldsToSlabRows(rateCard));
  const [weeklyPayConfigJson, setWeeklyPayConfigJson] = useState(
    rateCard.weeklyPayConfig ? JSON.stringify(rateCard.weeklyPayConfig) : ""
  );
  const [weeklyConfigError, setWeeklyConfigError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditRateCardFormValues>({
    resolver: zodResolver(editRateCardFormSchema),
    defaultValues: {
      rcType: rateCard.rcType,
      mgType: rateCard.mgType,
      minimumOrders: rateCard.minimumOrders,
      maximumOrders: rateCard.maximumOrders,
      mgAmount: Number(rateCard.mgAmount),
      variablePay: Number(rateCard.variablePay),
      weeklyIncentive: rateCard.weeklyIncentive ? Number(rateCard.weeklyIncentive) : undefined,
      orderIncentive: rateCard.orderIncentive ? Number(rateCard.orderIncentive) : undefined,
      minimumLoginHours: rateCard.minimumLoginHours ? Number(rateCard.minimumLoginHours) : undefined,
      changeSummary: "",
    },
  });

  async function submit(values: EditRateCardFormValues) {
    setWeeklyConfigError(null);
    let weeklyPayConfig: unknown = undefined;
    if (weeklyPayConfigJson.trim()) {
      try {
        weeklyPayConfig = JSON.parse(weeklyPayConfigJson);
      } catch {
        setWeeklyConfigError("Invalid JSON — check the syntax.");
        return;
      }
    }
    await onSubmit({ ...values, ...slabsToFields(slabs), weeklyPayConfig });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
        <p className="font-medium">
          {rateCard.store.storeName}{" "}
          <span className="font-mono text-xs text-muted">({rateCard.store.storeCode})</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {rateCard.store.city.name} · {formatWeekRange(rateCard.weekStartDate, rateCard.weekEndDate)} · Version{" "}
          {rateCard.version}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="RC Type" registration={register("rcType")} error={errors.rcType} />
        <TextField label="MG Type" registration={register("mgType")} error={errors.mgType} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberField label="Minimum Orders" registration={register("minimumOrders")} error={errors.minimumOrders} />
        <NumberField label="Maximum Orders" registration={register("maximumOrders")} error={errors.maximumOrders} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberField label="MG Amount" registration={register("mgAmount")} error={errors.mgAmount} step="0.01" />
        <NumberField
          label="Variable Amount"
          registration={register("variablePay")}
          error={errors.variablePay}
          step="0.01"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Weekly Incentive (optional)"
          registration={register("weeklyIncentive")}
          error={errors.weeklyIncentive}
          step="0.01"
        />
        <NumberField
          label="Order Incentive (optional)"
          registration={register("orderIncentive")}
          error={errors.orderIncentive}
          step="0.01"
        />
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Calculation Engine — MG &amp; Variable Slabs
        </p>

        <NumberField
          label="Minimum Login Hours (required for MG eligibility)"
          registration={register("minimumLoginHours")}
          error={errors.minimumLoginHours}
          step="0.1"
        />

        <SlabEditor slabs={slabs} onChange={setSlabs} />
      </div>

      <FieldWrapper
        label="Weekly F+V Configuration (advanced, JSON — optional)"
        hint='e.g. {"FV": {"variableRate": 50, "bonusSlabs": [{"minOrders": 90, "amount": 4800}]}}'
      >
        <textarea
          value={weeklyPayConfigJson}
          onChange={(e) => setWeeklyPayConfigJson(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
        />
        {weeklyConfigError && <p className="mt-1 text-xs text-danger">{weeklyConfigError}</p>}
      </FieldWrapper>

      <FieldWrapper
        label="What changed? (recorded in version history)"
        error={errors.changeSummary}
        hint="e.g. “Increased MG amount for the festive period.”"
      >
        <textarea
          {...register("changeSummary")}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </FieldWrapper>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
