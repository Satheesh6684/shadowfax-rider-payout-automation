export default function RateCardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rate Card Management</h1>
        <p className="mt-1 text-sm text-muted">
          This is the application home page — every calculation depends on the rate card
          configured here.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8 shadow-soft">
        <p className="text-sm text-muted">
          Module 1 (week selector, rate card table, store details drawer, version history,
          special incentives) ships in Phase 1. This route, the sidebar, and the week-aware
          header are the Phase 0 foundation everything else in the app builds on.
        </p>
      </div>
    </div>
  );
}
