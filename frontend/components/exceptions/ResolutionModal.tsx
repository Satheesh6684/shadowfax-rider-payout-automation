"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ExceptionTicket } from "@/lib/types";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exception: ExceptionTicket | null;
  mode: "resolve" | "ignore";
  onConfirm: (notes: string) => Promise<void>;
  isLoading: boolean;
}

export function ResolutionModal({ isOpen, onClose, exception, mode, onConfirm, isLoading }: ResolutionModalProps) {
  const [notes, setNotes] = useState("");

  async function handleConfirm() {
    if (!notes.trim()) return;
    await onConfirm(notes);
    setNotes("");
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "resolve" ? "Resolve Exception" : "Ignore Exception"}
      description={exception?.message}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            {mode === "resolve" ? "What was done to fix this?" : "Why is this being ignored?"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder={mode === "resolve" ? "e.g. Uploaded a corrected orders file with valid store codes." : "e.g. Known one-off data entry error, not worth re-uploading."}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={mode === "resolve" ? "primary" : "secondary"}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!notes.trim()}
          >
            {mode === "resolve" ? "Mark Resolved" : "Ignore"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
