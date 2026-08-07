const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return CURRENCY_FORMATTER.format(Number(value));
}

export function formatDate(value: string | Date): string {
  return DATE_FORMATTER.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return DATETIME_FORMATTER.format(new Date(value));
}

export function formatWeekRange(weekStartDate: string, weekEndDate: string): string {
  return `${formatDate(weekStartDate)} – ${formatDate(weekEndDate)}`;
}

/** Monday of the current UTC week, as a yyyy-mm-dd string for date inputs. */
export function currentWeekStartIso(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
  return monday.toISOString().slice(0, 10);
}
