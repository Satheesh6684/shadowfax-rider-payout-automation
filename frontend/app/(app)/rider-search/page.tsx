"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ridersApi } from "@/lib/api/riders";
import { RiderMasterInfo } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { RiderDetailPanel } from "@/components/rider-search/RiderDetailPanel";

const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export default function RiderSearchPage() {
  const { token } = useAuth();
  const { showError } = useToast();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [weekStartDate, setWeekStartDate] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [page, setPage] = useState(1);

  const [riders, setRiders] = useState<RiderMasterInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderMasterInfo | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, weekStartDate, storeCode]);

  const load = useCallback(async () => {
    if (!token) return;
    if (!debouncedQuery && !weekStartDate && !storeCode) {
      setRiders([]);
      setTotal(0);
      return;
    }
    setIsLoading(true);
    try {
      const result = await ridersApi.search(
        { query: debouncedQuery || undefined, weekStartDate: weekStartDate || undefined, storeCode: storeCode || undefined, page, pageSize: 25 },
        token
      );
      setRiders(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't search riders.");
    } finally {
      setIsLoading(false);
    }
  }, [token, debouncedQuery, weekStartDate, storeCode, page, showError]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rider Search</h1>
        <p className="mt-1 text-sm text-muted">Search by Rider ID or name, or filter by store and week.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-5 shadow-soft">
        <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
          <Search size={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Rider ID or name…"
            className="w-full bg-transparent outline-none placeholder:text-muted"
          />
        </div>
        <input
          type="text"
          value={storeCode}
          onChange={(e) => setStoreCode(e.target.value)}
          placeholder="Store code"
          className={selectClass}
        />
        <input
          type="date"
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
          className={selectClass}
        />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
          <TableSkeleton columns={3} />
        </div>
      ) : riders.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
          <p className="text-sm font-medium">
            {query || weekStartDate || storeCode ? "No riders found." : "Search for a rider to get started."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background/60">
              <tr>
                <th className="px-4 py-3 font-medium text-muted">Rider ID</th>
                <th className="px-4 py-3 font-medium text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-muted">On Record Since</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((rider) => (
                <tr
                  key={rider.id}
                  onClick={() => setSelectedRider(rider)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-background/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">{rider.riderId}</td>
                  <td className="px-4 py-3">{rider.riderName}</td>
                  <td className="px-4 py-3 text-muted">{new Date(rider.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{total} rider(s) · Page {page} of {totalPages}</span>
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

      <RiderDetailPanel rider={selectedRider} onClose={() => setSelectedRider(null)} />
    </div>
  );
}
