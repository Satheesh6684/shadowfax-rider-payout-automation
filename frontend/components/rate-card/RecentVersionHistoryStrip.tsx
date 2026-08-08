"use client";

import { useState } from "react";
import { RecentHistoryEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface RecentVersionHistoryStripProps {
  entries: RecentHistoryEntry[];
  isLoading: boolean;
}

function VersionCard({ entry }: { entry: RecentHistoryEntry; isFirst?: boolean }) {
  return (
    <div className="min-w-[220px] flex-1 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">v{entry.version}</span>
      </div>
      <p className="mt-1 text-xs text-foreground/90">
        {entry.changeSummary} — {entry.rateCard.store.storeName} ({entry.rateCard.store.storeCode})
      </p>
      <p className="mt-1.5 text-xs text-muted">
        {entry.changedBy} · {formatDateTime(entry.changedAt)}
      </p>
    </div>
  );
}

export function RecentVersionHistoryStrip({ entries, isLoading }: RecentVersionHistoryStripProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent Version History</h2>
        {entries.length > 0 && (
          <button onClick={() => setIsModalOpen(true)} className="text-xs font-medium text-primary hover:underline">
            View All Versions
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={1} columns={4} />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">No changes recorded for this week yet.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {entries.slice(0, 4).map((entry) => (
            <VersionCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="All Recent Versions" size="lg">
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  v{entry.version} — {entry.rateCard.store.storeName}{" "}
                  <span className="font-mono text-xs text-muted">({entry.rateCard.store.storeCode})</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">{entry.changeSummary}</p>
              </div>
              <Badge tone="neutral">{formatDateTime(entry.changedAt)}</Badge>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
