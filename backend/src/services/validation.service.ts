import { UploadRepository } from "../repositories/upload.repository";
import { ValidationRepository } from "../repositories/validation.repository";
import { ExceptionRepository } from "../repositories/exception.repository";
import { PaymentTypeService } from "./paymentType.service";
import { AuditLogService } from "./auditLog.service";
import { NotificationService } from "./notification.service";
import { parseWeekStart } from "../utils/week";
import { NotFoundError } from "../utils/AppError";
import { validateOrders } from "./validation/checks.orders";
import { validateLoginHours } from "./validation/checks.loginHours";
import { validateStagedRateCards } from "./validation/checks.rateCard";
import { validateValinor } from "./validation/checks.valinor";
import { validateCrossFile } from "./validation/checks.crossFile";
import { issue, RawIssue, ValidationCategory } from "./validation/types";
import type { Actor } from "../types/actor";
import type { UploadType } from "../validators/upload.validators";

const MODULE = "VALIDATION_ENGINE";
const UPLOAD_TYPES: UploadType[] = ["ORDERS", "LOGIN_HOURS", "RATE_CARD", "VALINOR"];

function overallStatus(errors: number, warnings: number): "PASSED" | "WARNING" | "FAILED" {
  if (errors > 0) return "FAILED";
  if (warnings > 0) return "WARNING";
  return "PASSED";
}

export const ValidationService = {
  async run(weekStartDateInput: string, actor: Actor) {
    const weekStartDate = parseWeekStart(weekStartDateInput);

    const [ordersBatch, loginBatch, rateCardBatch, valinorBatch] = await Promise.all(
      UPLOAD_TYPES.map((type) => UploadRepository.findCurrentBatch(type, weekStartDate))
    );

    const [orders, loginHours, stagedRateCards, payments] = await Promise.all([
      ordersBatch?.status === "SUCCESS" ? UploadRepository.findOrdersByBatch(ordersBatch.id) : Promise.resolve([]),
      loginBatch?.status === "SUCCESS" ? UploadRepository.findLoginHoursByBatch(loginBatch.id) : Promise.resolve([]),
      rateCardBatch?.status === "SUCCESS"
        ? UploadRepository.findRateCardsByBatch(rateCardBatch.id)
        : Promise.resolve([]),
      valinorBatch?.status === "SUCCESS" ? UploadRepository.findPaymentsByBatch(valinorBatch.id) : Promise.resolve([]),
    ]);

    const [liveRateCards, activePaymentTypes] = await Promise.all([
      UploadRepository.findLiveRateCardsForWeek(weekStartDate),
      PaymentTypeService.listActive(),
    ]);

    const issues: RawIssue[] = [
      ...validateOrders(orders),
      ...validateLoginHours(loginHours),
      ...validateStagedRateCards(stagedRateCards),
      ...validateValinor(payments),
      ...validateCrossFile({
        orders,
        loginHours,
        payments,
        stagedRateCards,
        liveRateCardStoreCodes: liveRateCards.map((rc) => rc.store.storeCode),
        activePaymentTypeNames: activePaymentTypes.map((pt) => pt.name),
      }),
    ];

    // Surface "nothing uploaded yet" as its own finding — actionable
    // information for the Review & Validate screen, distinct from a data
    // quality problem within a file that does exist.
    if (orders.length === 0) {
      issues.push(issue("ORDERS", "NO_DATA_UPLOADED", "WARNING", "No Orders data has been uploaded for this week."));
    }
    if (loginHours.length === 0) {
      issues.push(
        issue("LOGIN_HOURS", "NO_DATA_UPLOADED", "WARNING", "No Rider Login data has been uploaded for this week.")
      );
    }
    if (payments.length === 0) {
      issues.push(issue("VALINOR", "NO_DATA_UPLOADED", "WARNING", "No Valinor data has been uploaded for this week."));
    }

    const totalErrors = issues.filter((i) => i.severity === "ERROR").length;
    const totalWarnings = issues.filter((i) => i.severity === "WARNING").length;
    const status = overallStatus(totalErrors, totalWarnings);

    const run = await ValidationRepository.createRun({
      weekStartDate,
      status,
      totalErrors,
      totalWarnings,
      runBy: actor.email,
    });

    await ValidationRepository.createIssues(run.id, weekStartDate, issues);

    // Feed the Exception Management ledger — only ERROR severity becomes a
    // resolvable ticket; WARNING stays informational within the Validation
    // Engine's own issue list. This doesn't touch ValidationIssue at all
    // (already written above); it's a separate, additive write.
    await Promise.all(
      issues
        .filter((i) => i.severity === "ERROR")
        .map((i) =>
          ExceptionRepository.upsert({
            weekStartDate,
            source: "VALIDATION",
            category: i.category,
            checkName: i.checkName,
            severity: i.severity,
            riderId: typeof i.context?.riderId === "string" ? i.context.riderId : null,
            message: i.message,
            context: i.context as never,
            sourceRunId: run.id,
          })
        )
    );

    // Push each upload type's own slice of the result back onto its batch,
    // so the Upload Center cards reflect validation status too.
    const batchByType: Record<UploadType, { id: string } | null> = {
      ORDERS: ordersBatch,
      LOGIN_HOURS: loginBatch,
      RATE_CARD: rateCardBatch,
      VALINOR: valinorBatch,
    };
    await Promise.all(
      UPLOAD_TYPES.map((type) => {
        const batch = batchByType[type];
        if (!batch) return Promise.resolve();
        const categoryIssues = issues.filter((i) => i.category === (type as ValidationCategory));
        const categoryStatus = overallStatus(
          categoryIssues.filter((i) => i.severity === "ERROR").length,
          categoryIssues.filter((i) => i.severity === "WARNING").length
        );
        return UploadRepository.updateBatch(batch.id, { validationStatus: categoryStatus });
      })
    );

    await AuditLogService.record({
      userId: actor.userId,
      module: MODULE,
      action: "VALIDATION_RUN_COMPLETED",
      newValue: { weekStartDate, status, totalErrors, totalWarnings },
    });

    await NotificationService.create({
      type: status === "FAILED" ? "ERROR" : status === "WARNING" ? "INFO" : "SUCCESS",
      category: "VALIDATION",
      title: `Validation ${status.toLowerCase()}`,
      message: `${totalErrors} error(s), ${totalWarnings} warning(s) for the week of ${weekStartDate.toISOString().slice(0, 10)}.`,
    });

    return { run, issues };
  },

  async getLatestSummary(weekStartDateInput: string) {
    const weekStartDate = parseWeekStart(weekStartDateInput);
    const run = await ValidationRepository.findLatestRun(weekStartDate);
    return {
      run,
      canRunCalculation: !!run && run.status !== "FAILED",
    };
  },

  async listIssues(
    runId: string,
    filters: { category?: string; severity?: string },
    pagination: { page?: number; pageSize?: number }
  ) {
    const run = await ValidationRepository.findRunById(runId);
    if (!run) throw new NotFoundError("Validation run");
    return ValidationRepository.listIssues({ validationRunId: runId, ...filters }, pagination);
  },

  async listRuns(weekStartDateInput: string | undefined, pagination: { page?: number; pageSize?: number }) {
    if (!weekStartDateInput) {
      return ValidationRepository.listRuns(undefined, pagination);
    }
    return ValidationRepository.listRuns(parseWeekStart(weekStartDateInput), pagination);
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
