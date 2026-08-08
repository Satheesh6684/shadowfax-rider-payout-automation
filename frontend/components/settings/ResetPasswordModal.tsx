"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onConfirm: (newPassword: string) => Promise<void>;
  isLoading: boolean;
}

export function ResetPasswordModal({ isOpen, onClose, userName, onConfirm, isLoading }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reset Password — ${userName}`} size="sm">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">New Temporary Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="At least 8 characters"
          />
          <p className="mt-1 text-xs text-muted">The user will be required to change this on next login.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(password)} isLoading={isLoading} disabled={password.length < 8}>
            Reset Password
          </Button>
        </div>
      </div>
    </Modal>
  );
}
