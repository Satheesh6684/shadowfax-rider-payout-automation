"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ManagedUser, UserRole } from "@/lib/types";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null; // null = create mode
  onSubmit: (values: { name: string; email: string; role: UserRole; password?: string }) => Promise<void>;
  isLoading: boolean;
}

const ROLES: UserRole[] = ["ADMIN", "MANAGER", "OPERATIONS", "VIEWER"];
const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function UserFormModal({ isOpen, onClose, user, onSubmit, isLoading }: UserFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("VIEWER");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "VIEWER");
    setPassword("");
  }, [user, isOpen]);

  async function handleSubmit() {
    await onSubmit({ name, email, role, ...(user ? {} : { password }) });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? "Edit User" : "Create User"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!user}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {!user && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Temporary Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-xs text-muted">The user will be required to change this on first login.</p>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {user ? "Save Changes" : "Create User"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
