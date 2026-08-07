"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { paymentTypesApi } from "@/lib/api/paymentTypes";
import { PaymentType, PaymentTypeHistoryEntry } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { PaymentTypeFilterValues, PaymentTypeFilters } from "@/components/payment-config/PaymentTypeFilters";
import { PaymentTypeTable } from "@/components/payment-config/PaymentTypeTable";
import { PaymentTypeFormModal } from "@/components/payment-config/PaymentTypeFormModal";
import { PaymentTypeHistoryModal } from "@/components/payment-config/PaymentTypeHistoryModal";
import { CreatePaymentTypeFormValues, EditPaymentTypeFormValues } from "@/lib/validation/paymentType.schema";

const PAGE_SIZE = 25;

export default function PaymentConfigurationPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [filters, setFilters] = useState<PaymentTypeFilterValues>({ category: "", status: "", search: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<PaymentType[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [formTarget, setFormTarget] = useState<PaymentType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<PaymentType | null>(null);
  const [historyEntries, setHistoryEntries] = useState<PaymentTypeHistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PaymentType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.category, filters.status, debouncedSearch]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await paymentTypesApi.list(
        {
          category: filters.category || undefined,
          status: filters.status || undefined,
          search: debouncedSearch || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        token
      );
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load payment types.");
    } finally {
      setIsLoading(false);
    }
  }, [token, filters.category, filters.status, debouncedSearch, page, showError]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  function openCreate() {
    setFormTarget(null);
    setIsFormOpen(true);
  }

  function openEdit(paymentType: PaymentType) {
    setFormTarget(paymentType);
    setIsFormOpen(true);
  }

  async function handleFormSubmit(values: CreatePaymentTypeFormValues | EditPaymentTypeFormValues) {
    if (!token) return;
    setIsSubmitting(true);
    try {
      if (formTarget) {
        await paymentTypesApi.update(formTarget.id, values as EditPaymentTypeFormValues, token);
        showSuccess(`Updated "${values.name}".`);
      } else {
        await paymentTypesApi.create(values, token);
        showSuccess(`Created "${values.name}".`);
      }
      setIsFormOpen(false);
      loadList();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't save this payment type.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(paymentType: PaymentType) {
    if (!token) return;
    const nextStatus = paymentType.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await paymentTypesApi.updateStatus(paymentType.id, nextStatus, token);
      showSuccess(`${paymentType.name} is now ${nextStatus === "ACTIVE" ? "active" : "inactive"}.`);
      loadList();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't update status.");
    }
  }

  async function openHistory(paymentType: PaymentType) {
    if (!token) return;
    setHistoryTarget(paymentType);
    setIsHistoryOpen(true);
    try {
      const history = await paymentTypesApi.getVersionHistory(paymentType.id, token);
      setHistoryEntries(history);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load version history.");
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !token) return;
    setIsDeleting(true);
    try {
      await paymentTypesApi.delete(deleteTarget.id, token);
      showSuccess(`Deleted "${deleteTarget.name}".`);
      setDeleteTarget(null);
      loadList();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't delete this payment type.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment Configuration</h1>
          <p className="mt-1 text-sm text-muted">
            The catalogue of payment types the Calculation Engine will apply — incentives, recoveries, and
            penalties.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push("/payment-configuration/audit")}>
          <History size={14} /> Audit History
        </Button>
      </div>

      <PaymentTypeFilters values={filters} onChange={setFilters} onCreateNew={openCreate} />

      <PaymentTypeTable
        data={items}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onViewHistory={openHistory}
        onToggleStatus={handleToggleStatus}
      />

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {total} record{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <PaymentTypeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        paymentType={formTarget}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <PaymentTypeHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        paymentType={historyTarget}
        history={historyEntries}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete payment type?"
        description={
          deleteTarget
            ? `This removes "${deleteTarget.name}" from the active catalogue. It stays visible in audit history.`
            : ""
        }
        confirmLabel="Delete"
        tone="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
