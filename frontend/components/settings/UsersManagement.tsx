"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Power, PowerOff, KeyRound, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { usersApi } from "@/lib/api/users";
import { ManagedUser, UserRole } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { UserFormModal } from "./UserFormModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

export function UsersManagement() {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formTarget, setFormTarget] = useState<ManagedUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await usersApi.list({ pageSize: 50 }, token);
      setUsers(result.items);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load users.");
    } finally {
      setIsLoading(false);
    }
  }, [token, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFormSubmit(values: { name: string; email: string; role: UserRole; password?: string }) {
    if (!token) return;
    setIsSubmitting(true);
    try {
      if (formTarget) {
        await usersApi.update(formTarget.id, { name: values.name, role: values.role }, token);
        showSuccess(`Updated ${values.name}.`);
      } else {
        await usersApi.create({ name: values.name, email: values.email, role: values.role, password: values.password! }, token);
        showSuccess(`Created ${values.name}.`);
      }
      setIsFormOpen(false);
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't save this user.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(user: ManagedUser) {
    if (!token) return;
    try {
      await usersApi.setStatus(user.id, !user.isActive, token);
      showSuccess(`${user.name} is now ${!user.isActive ? "active" : "inactive"}.`);
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't update status.");
    }
  }

  async function handleResetPassword(newPassword: string) {
    if (!resetTarget || !token) return;
    setIsSubmitting(true);
    try {
      await usersApi.resetPassword(resetTarget.id, newPassword, token);
      showSuccess(`Password reset for ${resetTarget.name}.`);
      setResetTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setFormTarget(null);
            setIsFormOpen(true);
          }}
        >
          <Plus size={14} /> Create User
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <TableSkeleton columns={5} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60">
              <tr>
                <th className="px-4 py-3 font-medium text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-muted">Email</th>
                <th className="px-4 py-3 font-medium text-muted">Role</th>
                <th className="px-4 py-3 font-medium text-muted">Status</th>
                <th className="px-4 py-3 font-medium text-muted">Last Login</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-background/60">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone="primary">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.isActive ? "success" : "neutral"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        aria-label="Edit"
                        onClick={() => {
                          setFormTarget(u);
                          setIsFormOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        aria-label="Reset password"
                        onClick={() => setResetTarget(u)}
                        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        aria-label={u.isActive ? "Deactivate" : "Activate"}
                        onClick={() => handleToggleStatus(u)}
                        className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
                      >
                        {u.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        user={formTarget}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />
      <ResetPasswordModal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        userName={resetTarget?.name ?? ""}
        onConfirm={handleResetPassword}
        isLoading={isSubmitting}
      />
    </div>
  );
}
