import { ValidationError } from "./AppError";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Normalizes to midnight UTC so date-only comparisons/equality behave predictably. */
export function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** SRS §13.3: "Weeks always begin on Monday and end on Sunday." */
export function assertIsMonday(date: Date): void {
  if (date.getUTCDay() !== 1) {
    throw new ValidationError("Week start date must be a Monday.");
  }
}

export function weekEndFromStart(weekStartDate: Date): Date {
  return new Date(weekStartDate.getTime() + 6 * MS_PER_DAY);
}

export function parseWeekStart(input: string | Date): Date {
  const date = toUtcMidnight(new Date(input));
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Invalid week start date.");
  }
  assertIsMonday(date);
  return date;
}

const WEEK_LABEL_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const YEAR_FORMATTER = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "UTC" });

export function formatWeekLabel(weekStartDate: Date, weekEndDate: Date): string {
  return `${WEEK_LABEL_FORMATTER.format(weekStartDate)} – ${WEEK_LABEL_FORMATTER.format(
    weekEndDate
  )} ${YEAR_FORMATTER.format(weekEndDate)}`;
}
