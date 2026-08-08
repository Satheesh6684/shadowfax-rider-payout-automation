"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, Download, PlayCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { reportsApi } from "@/lib/api/reports";
import { GeneratedReport } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { currentWeekStartIso, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";

const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const canGenerate = usePermission("reports:generate");

  const [weekStartDate, setWeekStartDate] = useState(searchParams.get("week") ?? currentWeekStartIso());
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await reportsApi.list({ pageSize: 50 }, token);
      setReports(result.items);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't load report history.");
    } finally {
      setIsLoading(false);
    }
  }, [token, showError]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleGenerate() {
    if (!canGenerate) {
      showError("Your role doesn't have permission to generate reports.");
      return;
    }
    if (!token) return;
    setIsGenerating(true);
    try {
      const report = await reportsApi.generate(weekStartDate, token);
      showSuccess(`Report generated: ${report.fileName}`);
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't generate the report.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload(report: GeneratedReport) {
    if (!token) return;
    setDownloadingId(report.id);
    try {
      await reportsApi.download(report, token);
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't download this report.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Generate a multi-sheet weekly payout workbook — Summary, MG, Variable, F+V, Exceptions, Validation Errors,
          Missing Stores, Audit, Weekly Summary, Store Summary, and Rider Summary, all in one file.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-5 shadow-soft">
        <input
          type="date"
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
          className={selectClass}
        />
        <Button onClick={handleGenerate} isLoading={isGenerating} disabled={!canGenerate}>
          <PlayCircle size={14} /> Generate Report
        </Button>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">Report History</h2>
        {isLoading ? (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
            <TableSkeleton columns={6} />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-soft">
            <p className="text-sm font-medium">No reports generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-border bg-background/60">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted">File</th>
                  <th className="px-4 py-3 font-medium text-muted">Week</th>
                  <th className="px-4 py-3 font-medium text-muted">Size</th>
                  <th className="px-4 py-3 font-medium text-muted">Downloads</th>
                  <th className="px-4 py-3 font-medium text-muted">Generated</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-border last:border-0 hover:bg-background/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={14} className="text-success" />
                        <span className="font-mono text-xs">{report.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(report.weekStartDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted">{formatBytes(report.fileSizeBytes)}</td>
                    <td className="px-4 py-3">{report.downloadCount}</td>
                    <td className="px-4 py-3 text-muted">
                      {report.generatedBy} · {formatDateTime(report.generatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(report)}
                        isLoading={downloadingId === report.id}
                      >
                        <Download size={13} /> Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
