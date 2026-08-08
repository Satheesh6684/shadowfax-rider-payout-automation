import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { ReportRepository } from "../repositories/report.repository";
import { AuditLogService } from "./auditLog.service";
import { NotificationService } from "./notification.service";
import { gatherReportData } from "./report/reportData";
import { buildWeeklyPayoutWorkbook } from "./report/excelBuilder";
import { parseWeekStart } from "../utils/week";
import { NotFoundError } from "../utils/AppError";
import type { Actor } from "../types/actor";

const MODULE = "REPORTS";
const REPORTS_DIR = path.join(__dirname, "..", "..", "generated-reports");

function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

export const ReportService = {
  async generate(weekStartDateInput: string, actor: Actor) {
    const weekStartDate = parseWeekStart(weekStartDateInput);

    const data = await gatherReportData(weekStartDate);
    const workbook = buildWeeklyPayoutWorkbook(data);
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    ensureReportsDir();
    const weekTag = weekStartDate.toISOString().slice(0, 10);
    const fileName = `weekly-payout-report-${weekTag}-${Date.now()}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    const report = await ReportRepository.create({
      weekStartDate,
      reportType: "WEEKLY_PAYOUT_REPORT",
      format: "XLSX",
      filePath,
      fileName,
      fileSizeBytes: buffer.length,
      generatedBy: actor.email,
    });

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "REPORT_GENERATED",
      newValue: { weekStartDate, reportId: report.id, fileName, fileSizeBytes: buffer.length },
    });

    await NotificationService.create({
      type: "SUCCESS",
      category: "REPORT",
      title: "Weekly payout report generated",
      message: `${fileName} is ready to download.`,
    });

    return report;
  },

  async list(filters: { weekStartDate?: string; reportType?: string }, pagination: { page?: number; pageSize?: number }) {
    return ReportRepository.list(
      { weekStartDate: filters.weekStartDate ? parseWeekStart(filters.weekStartDate) : undefined, reportType: filters.reportType },
      pagination
    );
  },

  async getForDownload(id: string, actor: Actor) {
    const report = await ReportRepository.findById(id);
    if (!report || !fs.existsSync(report.filePath)) {
      throw new NotFoundError("Report file");
    }

    await ReportRepository.recordDownload(id);
    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "REPORT_DOWNLOADED",
      newValue: { reportId: id, fileName: report.fileName },
    });

    return report;
  },

  async getAuditLogs(params: {
    action?: string;
    userId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
  }) {
    return AuditLogService.search({ ...params, module: MODULE });
  },
};
