"use client";

import { useRef, useState } from "react";
import { CheckCircle2, History, LucideIcon, RefreshCw, Trash2, UploadCloud, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { uploadApi } from "@/lib/api/upload";
import { UploadBatch, UploadType } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls";

const STATUS_BADGE: Record<UploadBatch["status"], { label: string; tone: "primary" | "success" | "danger" | "neutral" }> = {
  PROCESSING: { label: "Processing", tone: "primary" },
  SUCCESS: { label: "Uploaded", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  REPLACED: { label: "Replaced", tone: "neutral" },
  REMOVED: { label: "Removed", tone: "neutral" },
};

const VALIDATION_BADGE: Record<UploadBatch["validationStatus"], { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  PENDING: { label: "Validation Pending", tone: "neutral" },
  PASSED: { label: "Validation Passed", tone: "success" },
  WARNING: { label: "Validation Warning", tone: "warning" },
  FAILED: { label: "Validation Failed", tone: "danger" },
};

interface UploadCardProps {
  uploadType: UploadType;
  label: string;
  description: string;
  icon: LucideIcon;
  batch: UploadBatch | null;
  weekStartDate: string;
  onChanged: () => void;
  onViewHistory: () => void;
}

export function UploadCard({
  uploadType,
  label,
  description,
  icon: Icon,
  batch,
  weekStartDate,
  onChanged,
  onViewHistory,
}: UploadCardProps) {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  const canWrite = usePermission("upload:write");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null); // awaiting replace confirmation
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  const hasActiveFile = batch && batch.status !== "REMOVED" && batch.status !== "REPLACED";

  async function submitUpload(file: File, replace: boolean) {
    if (!token) return;
    setIsUploading(true);
    setProgress(0);
    try {
      await uploadApi.upload({
        uploadType,
        file,
        weekStartDate,
        replace,
        token,
        onProgress: setProgress,
      });
      showSuccess(`${file.name} uploaded successfully.`);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPendingFile(file);
      } else {
        showError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
      }
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileSelected(file: File | undefined | null) {
    if (!file) return;
    if (!canWrite) {
      showError("Your role doesn't have permission to upload files.");
      return;
    }
    submitUpload(file, false);
  }

  async function confirmReplace() {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    await submitUpload(file, true);
  }

  async function handleRemoveConfirm() {
    if (!batch || !token) return;
    if (!canWrite) {
      showError("Your role doesn't have permission to remove files.");
      return;
    }
    try {
      await uploadApi.remove(batch.id, token);
      showSuccess(`${batch.fileName} removed.`);
      setIsRemoveConfirmOpen(false);
      onChanged();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't remove this file.");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted">{description}</p>
          </div>
        </div>
        <button
          aria-label="Upload history"
          onClick={onViewHistory}
          className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
        >
          <History size={15} />
        </button>
      </div>

      {isUploading ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border bg-background p-4">
          <p className="text-xs text-muted">{progress < 100 ? `Uploading… ${progress}%` : "Processing file…"}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress < 100 ? progress : 100}%` }}
            />
          </div>
        </div>
      ) : hasActiveFile && batch ? (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{batch.fileName}</p>
              <p className="mt-0.5 text-xs text-muted">
                {batch.totalRecords.toLocaleString()} rows · {formatDateTime(batch.uploadedAt)}
              </p>
            </div>
            {batch.status === "SUCCESS" ? (
              <CheckCircle2 size={16} className="shrink-0 text-success" />
            ) : batch.status === "FAILED" ? (
              <XCircle size={16} className="shrink-0 text-danger" />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone={STATUS_BADGE[batch.status].tone}>{STATUS_BADGE[batch.status].label}</Badge>
            <Badge tone={VALIDATION_BADGE[batch.validationStatus].tone}>
              {VALIDATION_BADGE[batch.validationStatus].label}
            </Badge>
          </div>

          {batch.errorMessage && <p className="text-xs text-danger">{batch.errorMessage}</p>}

          <div className="flex gap-2 border-t border-border pt-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
            >
              <RefreshCw size={13} /> Replace File
            </button>
            <button
              onClick={() => setIsRemoveConfirmOpen(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 size={13} /> Remove File
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            isDragging ? "border-primary bg-primary-soft" : "border-border bg-background hover:border-primary/40",
          ].join(" ")}
        >
          <UploadCloud size={22} className="text-muted" />
          <p className="text-xs text-muted">
            <span className="font-medium text-primary">Click to browse</span> or drag and drop
          </p>
          <p className="text-xs text-muted">CSV or XLSX</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      <ConfirmDialog
        isOpen={!!pendingFile}
        onClose={() => setPendingFile(null)}
        onConfirm={confirmReplace}
        title="Replace existing file?"
        description={
          pendingFile
            ? `A file already exists for this week and upload type. Replace it with "${pendingFile.name}"?`
            : ""
        }
        confirmLabel="Replace"
      />

      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        onClose={() => setIsRemoveConfirmOpen(false)}
        onConfirm={handleRemoveConfirm}
        title="Remove this file?"
        description={batch ? `This removes "${batch.fileName}" and its staged data for this week.` : ""}
        confirmLabel="Remove"
        tone="danger"
      />
    </div>
  );
}
