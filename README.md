# Shadowfax Amazon Rider Payout Arrears Management System

Phase 0 foundation + Phase 1 (Rate Card Management), built from the SRS v1.1
plus a follow-up implementation brief for the module itself.

## What's actually here

**Backend** (`/backend` — Node.js + Express + TypeScript + Prisma/MySQL)
- Prisma schema covering the core tables from SRS §15.3, with weekly
  versioning and history/audit tables built in from day one
- Centralized error handling, centralized Zod validation, JWT auth
  (single admin login), `AuditLogService` as the one write path for audit
  history, repository-pattern data access
- **Rate Card Management module, fully implemented:**
  - `WeeklyRateCard` — one live row per store per week; `status` field
    (ACTIVE / LOCKED / DELETED) drives Lock Week and soft-delete
  - `RateCardHistory` — every edit snapshots the pre-edit values before
    overwriting, tagged with version/changedBy/changedAt — this is what the
    Version History page reads
  - `Store` / `City` — normalized master data; the create form's plain
    city/store-name/store-code text resolves to these via find-or-create,
    with a conflict error if a store code already maps to a different name
  - Full CRUD + Copy Previous Week (clones a whole week, blocked if the
    target week already has records) + Lock Week (bulk status flip, blocked
    if already locked) + Version History + module-scoped Audit Logs
  - Every mutation is validated (Zod), authorized (`requireAuth`), and
    audit-logged with proper user attribution
  - `prisma/seed.ts` creates an initial admin user — needed before `/login`
    will work at all

**Frontend** (`/frontend` — Next.js 14 + TypeScript + Tailwind)
- App shell unchanged from Phase 0 (sidebar, WeekPill, no dashboard)
- **New: auth plumbing.** Phase 0 only built the backend's auth endpoints —
  nothing called them. This adds `AuthContext` (JWT persisted to
  localStorage), a `/login` page, and an `(app)` route group that gates
  every other route behind sign-in and applies the AppShell. `/login` itself
  intentionally has no sidebar.
- **Rate Card Management pages:** `/rate-card` (table, filters, pagination,
  copy/lock/delete), `/rate-card/new`, `/rate-card/[id]/edit`,
  `/rate-card/[id]/history`, `/rate-card/audit`
- Reusable UI primitives added: `Button`, `Badge`/`StatusBadge`, `Modal`,
  `ConfirmDialog`, `Skeleton`, `Toast` (success/error notifications) — none
  of these existed in Phase 0 and everything in the module builds on them
- CSV/Excel export runs client-side via SheetJS against the currently
  loaded table data (no new backend endpoint needed for this)

Both `npm install` and a full `next build` / `tsc --noEmit` pass were run
against this code — not just written, verified. One real bug caught and
fixed along the way: a `jwt.sign` type mismatch in the Phase 0 auth
middleware. The only outstanding gap is `prisma generate`, which needs to
download its engine binary from `binaries.prisma.sh` — unreachable from the
sandbox this was built in, but should work normally for you.

## Scope decisions worth knowing about

A few places where the implementation brief was ambiguous or went beyond
what the backend supports — flagging these rather than silently guessing:

- **"Copy" as a per-row table action** wasn't built — Copy Previous Week is
  a whole-week clone (matches the brief's own COPY PREVIOUS WEEK section),
  exposed as a page-level action, not a per-store row action.
- **Delete is soft**, not a hard row delete — status flips to `DELETED` and
  the record stays queryable through history/audit. This matches the
  broader SRS's "never overwrite/lose historical records" principle and
  avoids orphaning `RateCardHistory` rows.
- **MG Type** is on the model and required, even though the newer brief's
  field list omitted it — the original SRS explicitly requires it
  (§13.6, §13.14), and Phase 0's schema already had it.
- **Week end date isn't a form input** — only the Monday start date is
  collected; the end date is always computed as start + 6 days
  server-side, which also lets the API reject non-Monday starts cleanly.

## Running it locally

```bash
# Backend
cd backend
cp .env.example .env   # fill in a real MySQL DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed     # creates admin@shadowfax.local / ChangeMe123!
npm run dev              # http://localhost:5000

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev              # http://localhost:3000
```

Sign in at `/login` with the seeded admin credentials (override via
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars before seeding).

## What's next

Phase 2 is Payment Configuration — see `Shadowfax_Implementation_Plan.md`
for the full phase breakdown.

