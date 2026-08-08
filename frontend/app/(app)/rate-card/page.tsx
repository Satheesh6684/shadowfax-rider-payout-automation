"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { SortingState } from "@tanstack/react-table";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { rateCardsApi } from "@/lib/api/rateCards";
import { RateCard, City, RecentHistoryEntry, Store } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso } from "@/lib/format";
import { exportRateCardsToCsv, exportRateCardsToExcel } from "@/lib/export";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RateCardFilterValues, RateCardFilters } from "@/components/rate-card/RateCardFilters";
import { RateCardTable } from "@/components/rate-card/RateCardTable";
import { CopyWeekDialog } from "@/components/rate-card/CopyWeekDialog";
import { RateCardKpiCards } from "@/components/rate-card/RateCardKpiCards";
import { RecentVersionHistoryStrip } from "@/components/rate-card/RecentVersionHistoryStrip";
import { StoreDetailsPanel } from "@/components/rate-card/StoreDetailsPanel";
import { Button } from "@/components/ui/Button";

const PAGE_SIZE = 25;

export default function RateCardListPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const historyStripRef = useRef<HTMLDivElement>(null);
  const canWrite = usePermission("rate_card:write");

  const [filters, setFilters] = useState<RateCardFilterValues>({
    weekStartDate: currentWeekStartIso(),
    city: "",
    rcType: "",
    mgType: "",
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
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [recentHistory, setRecentHistory] = useState<RecentHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<RateCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isLockDialogOpen, setIsLockDialogOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [selectedRateCard, setSelectedRateCard] = useState<RateCard | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(handle);
  }, [filters.search]);

  useEffect(() => {
    setPage(1);
  }, [filters.weekStartDate, filters.city, filters.rcType, filters.mgType, filters.status, debouncedSearch]);

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
      // MG Type isn't a server-side filter (kept client-side — it's derived
      // from this week's data, not indexed like RC Type), so apply it here.
      const items = filters.mgType ? result.items.filter((rc) => rc.mgType === filters.mgType) : result.items;
      setRateCards(items);
      setTotal(filters.mgType ? items.length : result.total);
      setTotalPages(filters.mgType ? 1 : result.totalPages);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load rate cards.");
    } finally {
      setIsLoading(false);
    }
  }, [token, filters.weekStartDate, filters.city, filters.rcType, filters.mgType, filters.status, debouncedSearch, sorting, page, showError]);

  const loadWeekContext = useCallback(async () => {
    if (!token || !filters.weekStartDate) return;
    try {
      const rows = await rateCardsApi.getByWeek(filters.weekStartDate, token);
      setWeekRateCards(rows);
    } catch {
      setWeekRateCards([]);
    }
  }, [token, filters.weekStartDate]);

  const loadRecentHistory = useCallback(async () => {
    if (!token || !filters.weekStartDate) return;
    setIsHistoryLoading(true);
    try {
      const entries = await rateCardsApi.getRecentHistory(filters.weekStartDate, 20, token);
      setRecentHistory(entries);
    } catch {
      setRecentHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, filters.weekStartDate]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadWeekContext();
  }, [loadWeekContext]);

  useEffect(() => {
    loadRecentHistory();
  }, [loadRecentHistory]);

  useEffect(() => {
    if (!token) return;
    rateCardsApi.listCities(token).then(setCities).catch(() => setCities([]));
    rateCardsApi.listStores(undefined, token).then(setAllStores).catch(() => setAllStores([]));
  }, [token]);

  const rcTypes = useMemo(() => Array.from(new Set(weekRateCards.map((rc) => rc.rcType))).sort(), [weekRateCards]);
  const mgTypes = useMemo(() => Array.from(new Set(weekRateCards.map((rc) => rc.mgType))).sort(), [weekRateCards]);
  const isWeekLocked = weekRateCards.length > 0 && weekRateCards.every((rc) => rc.status === "LOCKED");
  const hasWeekResults = weekRateCards.length > 0;
  const activeRateCardCount = weekRateCards.filter((rc) => rc.status === "ACTIVE").length;
  const currentVersion = weekRateCards.length > 0 ? Math.max(...weekRateCards.map((rc) => rc.version)) : null;

  async function handleDeleteConfirm() {
    if (!deleteTarget || !token) return;
    setIsDeleting(true);
    try {
      await rateCardsApi.delete(deleteTarget.id, token);
      showSuccess(`Deleted rate card for ${deleteTarget.store.storeName}.`);
      setDeleteTarget(null);
      setSelectedRateCard(null);
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
      loadRecentHistory();
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

      <RateCardKpiCards
        totalStores={allStores.length}
        activeRateCards={activeRateCardCount}
        rcTypeCount={rcTypes.length}
        rcTypeSample={rcTypes}
        currentVersion={currentVersion}
      />

      <RateCardFilters
        values={filters}
        onChange={setFilters}
        cities={cities}
        rcTypes={rcTypes}
        mgTypes={mgTypes}
        onCreateNew={() => router.push(`/rate-card/new?week=${filters.weekStartDate}`)}
        onCreateNewWeek={() => setIsCopyDialogOpen(true)}
        onLockWeek={() => setIsLockDialogOpen(true)}
        onExportCsv={() => exportRateCardsToCsv(rateCards)}
        onExportExcel={() => exportRateCardsToExcel(rateCards)}
        onViewVersionHistory={() => historyStripRef.current?.scrollIntoView({ behavior: "smooth" })}
        isWeekLocked={isWeekLocked || !canWrite}
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
        onRowClick={setSelectedRateCard}
        canWrite={canWrite}
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

      <div ref={historyStripRef}>
        <RecentVersionHistoryStrip entries={recentHistory} isLoading={isHistoryLoading} />
      </div>

      <StoreDetailsPanel
        rateCard={selectedRateCard}
        onClose={() => setSelectedRateCard(null)}
        onEdit={() => selectedRateCard && router.push(`/rate-card/${selectedRateCard.id}/edit`)}
        onViewFullHistory={() => selectedRateCard && router.push(`/rate-card/${selectedRateCard.id}/history`)}
        canWrite={canWrite}
      />

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
