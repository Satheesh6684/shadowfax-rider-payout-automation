"use client";

import { Plus, Trash2 } from "lucide-react";
import { SlabRow } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface SlabEditorProps {
  slabs: SlabRow[];
  onChange: (slabs: SlabRow[]) => void;
}

const MAX_SLABS = 7;
const inputClass =
  "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary";

/**
 * Up to 7 rows of (Up to Orders / MG Amount / Variable Amount) — the O1-O7 /
 * MG1-MG7 / Var1-Var7 slabs from the business rules, sharing one O
 * threshold per row since both MG and Variable key off the same order
 * count. A store needing only one tier just adds one row.
 */
export function SlabEditor({ slabs, onChange }: SlabEditorProps) {
  function updateRow(index: number, patch: Partial<SlabRow>) {
    const next = slabs.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  }

  function addRow() {
    if (slabs.length >= MAX_SLABS) return;
    onChange([...slabs, { maxOrders: undefined, mgAmount: undefined, variableAmount: undefined }]);
  }

  function removeRow(index: number) {
    onChange(slabs.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted">
        <span>Up to Orders</span>
        <span>MG Amount</span>
        <span>Variable Amount</span>
        <span />
      </div>

      {slabs.length === 0 && (
        <p className="text-xs text-muted">No slabs configured yet — MG and Variable can&apos;t be calculated until at least one is added.</p>
      )}

      {slabs.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <input
            type="number"
            min={0}
            value={row.maxOrders ?? ""}
            onChange={(e) => updateRow(i, { maxOrders: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={inputClass}
            placeholder={`O${i + 1}`}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={row.mgAmount ?? ""}
            onChange={(e) => updateRow(i, { mgAmount: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={inputClass}
            placeholder={`MG${i + 1}`}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={row.variableAmount ?? ""}
            onChange={(e) => updateRow(i, { variableAmount: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={inputClass}
            placeholder={`Var${i + 1}`}
          />
          <button
            type="button"
            aria-label="Remove slab"
            onClick={() => removeRow(i)}
            className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {slabs.length < MAX_SLABS && (
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          <Plus size={13} /> Add Slab
        </Button>
      )}
    </div>
  );
}
