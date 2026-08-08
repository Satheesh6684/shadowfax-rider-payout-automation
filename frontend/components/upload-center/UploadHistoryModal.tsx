"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { uploadApi } from "@/lib/api/upload";
import { UploadBatch, UploadType } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";

interface UploadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadType: UploadType | null;
  label: string;
}

const STATUS_TONE: Record<UploadBatch["status"], "primary" | "success" | "danger" | "neutral"> = {
  PROCESSING: "primary",
  SUCCESS: "success",
  FAILED: "danger",
  REPLACED: "neutral",
  REMOVED: "neutral",
};

export function UploadHistoryModal({ isOpen, onClose, uploadType, label }: UploadHistoryModalProps) {
  const { token } = useAuth();
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !uploadType || !token) return;
    setIsLoading(true);
    uploadApi
      .getHistory({ uploadType, pageSize: 50 }, token)
      .then((result) => setBatches(result.items))
      .catch(() => setBatches([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, uploadType, token]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Upload History — ${label}`} size="lg">
      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : batches.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No uploads yet.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-border bg-background/90">
              <tr>
                <th className="px-3 py-2 font-medium text-muted">File</th>
                <th className="px-3 py-2 font-medium text-muted">Week</th>
                <th className="px-3 py-2 font-medium text-muted">Rows</th>
                <th className="px-3 py-2 font-medium text-muted">Status</th>
                <th className="px-3 py-2 font-medium text-muted">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b border-border last:border-0">
                  <td className="max-w-[180px] truncate px-3 py-2">{batch.fileName}</td>
                  <td className="px-3 py-2 text-muted">{new Date(batch.weekStartDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{batch.totalRecords.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[batch.status]}>{batch.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted">{formatDateTime(batch.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
