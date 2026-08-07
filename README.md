# Shadowfax Amazon Rider Payout Arrears Management System

Phase 0 (foundation) + Phase 1 (Rate Card Management) + Payment
Configuration, built from the SRS v1.1 plus follow-up implementation briefs.

## What's actually here

**Backend** (`/backend` — Node.js + Express + TypeScript + Prisma/MySQL)
- Phase 0 foundation: Prisma schema, centralized error handling/validation,
  JWT auth (single admin), `AuditLogService`, repository pattern
- **Rate Card Management** — full CRUD, versioned edits, Copy Previous Week,
  Lock Week, version history, module-scoped audit logs
- **Payment Configuration** — a `PaymentType` master registry (name,
  category, calculation method, priority, enable/disable), same
  versioned-edit + soft-delete + audit pattern as Rate Card. Endpoints:
  `GET/POST /payment-types`, `GET/PUT/DELETE /payment-types/:id`,
  `PATCH /payment-types/:id/status`, `GET /payment-types/:id/history`,
  `GET /payment-types/audit-logs`, `GET /payment-types/active` (used by
  other modules that need the live catalogue, not a paginated page of it).
  A shared `Actor` type (`src/types/actor.ts`) now carries user attribution
  across every module's service layer, instead of living inside
  `rateCard.service.ts`.
- The *original* SRS's `PaymentConfiguration` model (payment categories
  auto-detected from a weekly Valinor upload) is still just a schema stub —
  no repository/service/controller yet. Expect it to get wired up once
  Upload Center's Valinor upload exists.

**Frontend** (`/frontend` — Next.js 14 + TypeScript + Tailwind)
- Auth plumbing, app shell, and Rate Card Management pages as before
- **Payment Configuration**: `/payment-configuration` (list, search, filter
  by category/status, pagination, create/edit/history modals, enable-disable
  toggle, delete) and `/payment-configuration/audit`
- `components/shared/AuditHistoryTable.tsx` — the audit table used to be
  Rate-Card-specific; it's now generalized (action labels/tones passed as
  props) so Payment Configuration reuses it instead of duplicating it. Both
  modules' audit pages were updated to pass their own label/tone maps.
- `apiClient` gained a `.patch()` method for the status-toggle endpoint

Both `npm install` and a full `next build` / `tsc --noEmit` pass were run
after adding Payment Configuration — same verification standard as Rate
Card. One real bug was caught and fixed mid-build: an earlier edit to
`lib/types.ts` had accidentally dropped the `RateCardFormValues` interface's
opening line while inserting the new Payment Type types above it — caught by
the build failing, not by inspection, which is exactly why this project
verifies with a real compiler pass rather than just writing plausible-looking
code. The only remaining known gap is `prisma generate`, which needs to
download its engine binary from `binaries.prisma.sh` — unreachable from the
sandbox this was built in, but should work normally for you.

## Scope decisions worth knowing about

- **Payment Type "Delete" is soft**, not a hard row delete — status flips to
  `DELETED`, same reasoning as Rate Card: avoids orphaning
  `PaymentTypeHistory` rows and matches the SRS's "never lose historical
  records" principle.
- **Calculation Method values** (`FIXED_AMOUNT` / `PERCENTAGE` /
  `FORMULA_BASED`) aren't specified anywhere in either brief — this is an
  assumption, flagged rather than silently invented. Easy to extend since
  it's a single enum in one validators file.
- **Create/Edit uses a shared modal**, not separate pages like Rate Card —
  Payment Type has no immutable identity field (no store+week equivalent),
  so there was no reason to force a page navigation for what's simple
  master-data CRUD.

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

## What's next

Upload Center, then Validation Engine — see
`Shadowfax_Implementation_Plan.md` for the full phase breakdown.


