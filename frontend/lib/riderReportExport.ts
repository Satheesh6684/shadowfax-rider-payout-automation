import * as XLSX from "xlsx";
import { RiderCalculationResult, RiderMasterInfo } from "@/lib/types";
import { formatDate } from "@/lib/format";

/** Client-side "Download Rider Report" — exports a rider's calculation
 * history to CSV, reusing the same SheetJS pattern as Rate Card's export
 * rather than adding a new backend endpoint for what's fundamentally the
 * same operation (format a list of rows the client already has). */
export function exportRiderReport(rider: RiderMasterInfo, history: RiderCalculationResult[]) {
  const rows = history.map((h) => ({
    Week: formatDate(h.weekStartDate),
    Status: h.status,
    "Total Eligible": h.totalEligibleAmount ?? "",
    "Actual (Valinor)": h.actualAmount ?? "",
    Pending: h.pendingAmount ?? "",
    Remarks: h.remarks ?? "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rider History");
  XLSX.writeFile(workbook, `rider-report-${rider.riderId}.csv`, { bookType: "csv" });
}
