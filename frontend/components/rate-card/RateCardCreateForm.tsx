"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateRateCardFormValues, createRateCardFormSchema } from "@/lib/validation/rateCard.schema";
import { useMasterData } from "@/lib/hooks/useMasterData";
import { currentWeekStartIso } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, NumberField, TextField } from "./FormFields";

interface RateCardCreateFormProps {
  onSubmit: (values: CreateRateCardFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  defaultWeekStartDate?: string;
}

export function RateCardCreateForm({
  onSubmit,
  onCancel,
  isSubmitting,
  defaultWeekStartDate,
}: RateCardCreateFormProps) {
  const { cities, stores } = useMasterData();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateRateCardFormValues>({
    resolver: zodResolver(createRateCardFormSchema),
    defaultValues: {
      weekStartDate: defaultWeekStartDate ?? currentWeekStartIso(),
    },
  });

  const storeCodeRegistration = register("storeCode");

  function handleStoreCodeBlur(storeCode: string) {
    const match = stores.find((s) => s.storeCode.toLowerCase() === storeCode.trim().toLowerCase());
    if (match) {
      setValue("storeName", match.storeName);
      setValue("cityName", match.city.name);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FieldWrapper label="Week (must start on a Monday)" error={errors.weekStartDate}>
        <input
          type="date"
          {...register("weekStartDate")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </FieldWrapper>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Store Code"
          registration={{
            ...storeCodeRegistration,
            onBlur: (e) => {
              handleStoreCodeBlur(e.target.value);
              return storeCodeRegistration.onBlur(e);
            },
          }}
          error={errors.storeCode}
          list="store-code-options"
          placeholder="e.g. BLR-014"
        />
        <TextField label="Store Name" registration={register("storeName")} error={errors.storeName} />
      </div>

      <TextField label="City" registration={register("cityName")} error={errors.cityName} list="city-options" />

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

      <datalist id="city-options">
        {cities.map((city) => (
          <option key={city.id} value={city.name} />
        ))}
      </datalist>
      <datalist id="store-code-options">
        {stores.map((store) => (
          <option key={store.id} value={store.storeCode} />
        ))}
      </datalist>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Create Rate Card
        </Button>
      </div>
    </form>
  );
}
