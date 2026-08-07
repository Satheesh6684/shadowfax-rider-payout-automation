"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface CopyWeekDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetWeekStartDate: string;
  onConfirm: (sourceWeekStartDate: string) => Promise<void>;
  isLoading: boolean;
}

export function CopyWeekDialog({ isOpen, onClose, targetWeekStartDate, onConfirm, isLoading }: CopyWeekDialogProps) {
  const [sourceWeek, setSourceWeek] = useState("");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Copy Previous Week"
      description="Clones every active rate card from the source week into the currently selected week. Version resets to 1 for each."
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Source week</label>
          <input
            type="date"
            value={sourceWeek}
            onChange={(e) => setSourceWeek(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <p className="text-xs text-muted">
          Copying into the week of <span className="font-medium text-foreground">{targetWeekStartDate || "—"}</span>.
        </p>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(sourceWeek)} isLoading={isLoading} disabled={!sourceWeek}>
            Copy Rate Cards
          </Button>
        </div>
      </div>
    </Modal>
  );
}
