"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditRateCardFormValues, editRateCardFormSchema } from "@/lib/validation/rateCard.schema";
import { RateCard } from "@/lib/types";
import { formatWeekRange } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, NumberField, TextField } from "./FormFields";

interface RateCardEditFormProps {
  rateCard: RateCard;
  onSubmit: (values: EditRateCardFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function RateCardEditForm({ rateCard, onSubmit, onCancel, isSubmitting }: RateCardEditFormProps) {
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
      changeSummary: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
