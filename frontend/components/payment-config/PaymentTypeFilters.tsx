"use client";

import { Plus, Search } from "lucide-react";
import { CATEGORY_LABELS, PAYMENT_CATEGORIES } from "@/lib/validation/paymentType.schema";
import { Button } from "@/components/ui/Button";

export interface PaymentTypeFilterValues {
  category: string;
  status: string;
  search: string;
}

interface PaymentTypeFiltersProps {
  values: PaymentTypeFilterValues;
  onChange: (values: PaymentTypeFilterValues) => void;
  onCreateNew: () => void;
}

const selectClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export function PaymentTypeFilters({ values, onChange, onCreateNew }: PaymentTypeFiltersProps) {
  function set<K extends keyof PaymentTypeFilterValues>(key: K, value: PaymentTypeFilterValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={values.category} onChange={(e) => set("category", e.target.value)} className={selectClass}>
            <option value="">All categories</option>
            {PAYMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <select value={values.status} onChange={(e) => set("status", e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <Button size="sm" onClick={onCreateNew}>
          <Plus size={14} /> New Payment Type
        </Button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
        <Search size={15} />
        <input
          type="text"
          value={values.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search by name or description…"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}
