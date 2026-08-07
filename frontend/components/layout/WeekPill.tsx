import { CalendarDays } from "lucide-react";

interface WeekPillProps {
  label: string; // e.g. "04 Aug – 10 Aug 2026"
  isCurrent?: boolean;
}

/**
 * Every module in the SRS — Rate Card, Payment Config, Uploads,
 * Calculations, Reports — is scoped to a single week, and editing a past
 * week is a mistake the app should make hard to make by accident. This pill
 * lives in the header on every page so the operating week is never ambient
 * context you have to remember — it's always on screen, and it visibly
 * changes color when you're looking at history instead of the live week.
 */
export function WeekPill({ label, isCurrent = true }: WeekPillProps) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        isCurrent
          ? "border-primary/20 bg-primary-soft text-primary"
          : "border-warning/20 bg-warning-soft text-warning",
      ].join(" ")}
    >
      <CalendarDays size={13} strokeWidth={2.2} />
      {label}
      <span className="opacity-70">{isCurrent ? "Current week" : "Historical — read only"}</span>
    </div>
  );
}
