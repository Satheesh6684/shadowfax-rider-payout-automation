import { Search } from "lucide-react";
import { WeekPill } from "./WeekPill";

// Static placeholder week for Phase 0. Phase 1 replaces this with real
// week-selector state (shared via context) so every page reads the same
// selected week.
const CURRENT_WEEK_LABEL = "04 Aug – 10 Aug 2026";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search stores, riders, orders…"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>

      <WeekPill label={CURRENT_WEEK_LABEL} isCurrent />

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary">
        AD
      </div>
    </header>
  );
}
