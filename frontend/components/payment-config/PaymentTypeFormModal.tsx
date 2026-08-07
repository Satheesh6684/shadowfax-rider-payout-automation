"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, NumberField, TextField } from "@/components/rate-card/FormFields";
import {
  CALCULATION_METHODS,
  CALCULATION_METHOD_LABELS,
  CATEGORY_LABELS,
  CreatePaymentTypeFormValues,
  createPaymentTypeFormSchema,
  EditPaymentTypeFormValues,
  editPaymentTypeFormSchema,
  PAYMENT_CATEGORIES,
} from "@/lib/validation/paymentType.schema";
import { PaymentType } from "@/lib/types";

interface PaymentTypeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentType: PaymentType | null; // null = create mode
  onSubmit: (values: CreatePaymentTypeFormValues | EditPaymentTypeFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function PaymentTypeFormModal({
  isOpen,
  onClose,
  paymentType,
  onSubmit,
  isSubmitting,
}: PaymentTypeFormModalProps) {
  const isEdit = !!paymentType;
  const schema = isEdit ? editPaymentTypeFormSchema : createPaymentTypeFormSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePaymentTypeFormValues & Partial<EditPaymentTypeFormValues>>({
    // Both schemas share the base fields; edit mode's extra changeSummary
    // field is simply absent from defaultValues in create mode.
    resolver: zodResolver(schema as never),
    values: paymentType
      ? {
          name: paymentType.name,
          category: paymentType.category,
          calculationMethod: paymentType.calculationMethod,
          priority: paymentType.priority,
          description: paymentType.description ?? "",
          changeSummary: "",
        }
      : { name: "", category: "ORDER_INCENTIVE", calculationMethod: "FIXED_AMOUNT", priority: 0, description: "" },
  });

  async function submit(values: CreatePaymentTypeFormValues & Partial<EditPaymentTypeFormValues>) {
    await onSubmit(values);
    reset();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Payment Type" : "Create Payment Type"}
      description={isEdit ? "Changes are versioned and recorded in history." : undefined}
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <TextField label="Name" registration={register("name")} error={errors.name} placeholder="e.g. Peak Hour Bonus" />

        <div className="grid grid-cols-2 gap-4">
          <FieldWrapper label="Category" error={errors.category}>
            <select
              {...register("category")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {PAYMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </FieldWrapper>

          <FieldWrapper label="Calculation Method" error={errors.calculationMethod}>
            <select
              {...register("calculationMethod")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {CALCULATION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {CALCULATION_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </FieldWrapper>
        </div>

        <NumberField label="Priority" registration={register("priority")} error={errors.priority} />

        <FieldWrapper label="Description (optional)" error={errors.description}>
          <textarea
            {...register("description")}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </FieldWrapper>

        {isEdit && (
          <FieldWrapper label="What changed? (recorded in version history)" error={errors.changeSummary}>
            <textarea
              {...register("changeSummary")}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </FieldWrapper>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save Changes" : "Create Payment Type"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
