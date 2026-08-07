"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { SortingState } from "@tanstack/react-table";
import { useAuth } from "@/lib/auth/AuthContext";
import { rateCardsApi } from "@/lib/api/rateCards";
import { RateCard, City } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso } from "@/lib/format";
import { exportRateCardsToCsv, exportRateCardsToExcel } from "@/lib/export";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RateCardFilterValues, RateCardFilters } from "@/components/rate-card/RateCardFilters";
import { RateCardTable } from "@/components/rate-card/RateCardTable";
import { CopyWeekDialog } from "@/components/rate-card/CopyWeekDialog";
import { Button } from "@/components/ui/Button";

const PAGE_SIZE = 25;

export default function RateCardListPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [filters, setFilters] = useState<RateCardFilterValues>({
    weekStartDate: currentWeekStartIso(),
    city: "",
    rcType: "",
    status: "",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);

  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [weekRateCards, setWeekRateCards] = useState<RateCard[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<RateCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // Debounce free-text search so every keystroke doesn't fire a request.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.weekStartDate, filters.city, filters.rcType, filters.status, debouncedSearch]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const sort = sorting[0];
      const result = await rateCardsApi.list(
        {
          weekStartDate: filters.weekStartDate || undefined,
          city: filters.city || undefined,
          rcType: filters.rcType || undefined,
          status: filters.status || undefined,
          search: debouncedSearch || undefined,
          sortBy: sort?.id,
          sortDir: sort ? (sort.desc ? "desc" : "asc") : undefined,
          page,
          pageSize: PAGE_SIZE,
        },
        token
      );
      setRateCards(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load rate cards.");
    } finally {
      setIsLoading(false);
    }
  }, [token, filters.weekStartDate, filters.city, filters.rcType, filters.status, debouncedSearch, sorting, page, showError]);

  // Separate, week-only fetch — drives Lock Week / New Rate Card availability
  // and the RC Type filter options, independent of whatever else is filtered.
  const loadWeekContext = useCallback(async () => {
    if (!token || !filters.weekStartDate) return;
    try {
      const rows = await rateCardsApi.getByWeek(filters.weekStartDate, token);
      setWeekRateCards(rows);
    } catch {
      setWeekRateCards([]);
    }
  }, [token, filters.weekStartDate]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadWeekContext();
  }, [loadWeekContext]);

  useEffect(() => {
    if (!token) return;
    rateCardsApi.listCities(token).then(setCities).catch(() => setCities([]));
  }, [token]);

  const rcTypes = useMemo(
    () => Array.from(new Set(weekRateCards.map((rc) => rc.rcType))).sort(),
    [weekRateCards]
  );
  const isWeekLocked = weekRateCards.length > 0 && weekRateCards.every((rc) => rc.status === "LOCKED");
  const hasWeekResults = weekRateCards.length > 0;

  async function handleDeleteConfirm() {
    if (!deleteTarget || !token) return;
    setIsDeleting(true);
    try {
      await rateCardsApi.delete(deleteTarget.id, token);
      showSuccess(`Deleted rate card for ${deleteTarget.store.storeName}.`);
      setDeleteTarget(null);
      loadList();
      loadWeekContext();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't delete this rate card.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCopyConfirm(sourceWeekStartDate: string) {
    if (!token) return;
    setIsCopying(true);
    try {
      const result = await rateCardsApi.copyPreviousWeek(sourceWeekStartDate, filters.weekStartDate, token);
      showSuccess(`Copied ${result.recordsCopied} rate card(s) into this week.`);
      setIsCopyDialogOpen(false);
      loadList();
      loadWeekContext();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't copy the previous week.");
    } finally {
      setIsCopying(false);
    }
  }

  async function handleLockConfirm() {
    if (!token) return;
    setIsLocking(true);
    try {
      const result = await rateCardsApi.lockWeek(filters.weekStartDate, token);
      showSuccess(`Locked ${result.recordsLocked} rate card(s) for this week.`);
      setIsLockDialogOpen(false);
      loadList();
      loadWeekContext();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't lock this week.");
    } finally {
      setIsLocking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rate Card Management</h1>
          <p className="mt-1 text-sm text-muted">
            Every calculation depends on the rate card configured here — this is the application home page.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push("/rate-card/audit")}>
          <History size={14} /> Audit History
        </Button>
      </div>

      <RateCardFilters
        values={filters}
        onChange={setFilters}
        cities={cities}
        rcTypes={rcTypes}
        onCreateNew={() => router.push(`/rate-card/new?week=${filters.weekStartDate}`)}
        onCopyWeek={() => setIsCopyDialogOpen(true)}
        onLockWeek={() => setIsLockDialogOpen(true)}
        onExportCsv={() => exportRateCardsToCsv(rateCards)}
        onExportExcel={() => exportRateCardsToExcel(rateCards)}
        isWeekLocked={isWeekLocked}
        hasResults={hasWeekResults}
      />

      <RateCardTable
        data={rateCards}
        isLoading={isLoading}
        sorting={sorting}
        onSortingChange={setSorting}
        onEdit={(rc) => router.push(`/rate-card/${rc.id}/edit`)}
        onDelete={setDeleteTarget}
        onViewHistory={(rc) => router.push(`/rate-card/${rc.id}/history`)}
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
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete rate card?"
        description={
          deleteTarget
            ? `This removes the rate card for ${deleteTarget.store.storeName} (${deleteTarget.store.storeCode}) from this week. It stays visible in audit history.`
            : ""
        }
        confirmLabel="Delete"
        tone="danger"
        isLoading={isDeleting}
      />

      <CopyWeekDialog
        isOpen={isCopyDialogOpen}
        onClose={() => setIsCopyDialogOpen(false)}
        targetWeekStartDate={filters.weekStartDate}
        onConfirm={handleCopyConfirm}
        isLoading={isCopying}
      />

      <ConfirmDialog
        isOpen={isLockDialogOpen}
        onClose={() => setIsLockDialogOpen(false)}
        onConfirm={handleLockConfirm}
        title="Lock this week?"
        description="Locked rate cards become read-only — no editing or deleting. This applies to every store in the selected week."
        confirmLabel="Lock Week"
        isLoading={isLocking}
      />
    </div>
  );
}
