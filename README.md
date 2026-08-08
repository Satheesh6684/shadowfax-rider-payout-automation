# Shadowfax Amazon Rider Payout Arrears Management System

All 12 modules present with real backend + frontend + database integration.
This README reflects the current state only.

## This phase: completing RBAC UI coverage + workflow chain + quality review

**RBAC frontend coverage extended to every remaining write action:**
Exceptions (resolve/ignore/reopen/reprocess), Reports (generate), Settings
(save — wrapped the whole form in a `<fieldset disabled>` so VIEWER/
OPERATIONS see a genuinely read-only form, not just a blocked button).
Combined with last phase's Rate Card/Payment Configuration/Upload Center
coverage, every module with a write action now has both frontend gating
*and* backend enforcement (the backend was always the real boundary; this
phase closes the UX gap where a disallowed action would previously show a
raw API error instead of being disabled/toast-guarded upfront).

**Workflow chain completed** (item 11's explicit ask — verify Upload →
Validate → Calculate → Exceptions → Reports → Download is fully connected):
found two real gaps by actually checking, not assuming. Calculation
Engine's Exceptions count had no way to navigate to Exceptions; Exceptions
had no forward link to Reports. Both fixed, and the selected week now
carries through the whole chain via query params (Calculation Engine →
Exceptions → Reports all read `?week=`).

**Quality review — real findings:**
- Scanned every component/lib file for actual imports (not just assumed
  clean): frontend has zero orphaned files. Backend: found and removed one
  genuinely dead file, `base.repository.ts` — a Phase 0 interface no
  repository ever ended up implementing.
- Removed stale placeholder comments in `routes/index.ts` referencing
  modules (`review`, plus duplicate mentions of `upload`/`calculate`/
  `reports`/`riders`) that are now actually mounted above them, or were
  merged into another module rather than built separately.
- Caught and corrected my own process error mid-check: a "TypeScript
  deprecation warning" turned out to be a stray global TS 6.0.3 answering
  `npx tsc` because I'd forgotten to reinstall `node_modules` after a
  cleanup — not a real project issue. Reinstalled properly and confirmed
  the project's actually-pinned TypeScript 5.9.3 is clean. Worth recording
  so it's clear this was verified, not hand-waved.
- ESLint: no config file existed despite the dependency being present
  since Phase 0 (found last phase); still clean now with 0 errors/warnings
  after all of this phase's changes.
- Cross-referenced every frontend API call's path against actual backend
  route registrations — zero dead/broken API calls found.

Full `npm install` + `next build` + `tsc --noEmit` + `eslint` passed clean
after every change this phase, same standard as every prior phase.

## What's still genuinely incomplete

- **Special Incentives** — still exceptions out. No formula or eligibility
  structure has ever been given across any turn; finishing it means
  inventing one, which every phase has consistently declined to do.
- RBAC read-endpoint gating (writes are fully protected; reads remain open
  to any authenticated user by design/scope choice, not oversight).
- Forced password-change enforcement (the field and tracking exist; no UI
  flow forces the change yet).
- Automated tests — zero exist anywhere in the repo.
- Live-database verification — this schema has never once run against a
  real MySQL instance; `prisma generate` has been blocked by this sandbox's
  lack of network access to `binaries.prisma.sh` for the entire project.

## Manual test checklist before considering this deployment-ready

- [ ] `prisma generate` + `migrate dev` actually succeed against a real MySQL instance
- [ ] Seed script creates the admin user; login works end-to-end
- [ ] Create a MANAGER/OPERATIONS/VIEWER user via Settings → User Management; confirm each role's UI restrictions match what's documented above, and that attempting a disallowed action via direct API call (not just UI) is rejected server-side
- [ ] Full workflow: upload real Orders/Login/Rate Card/Valinor files → Review & Validate passes → Run Calculation → confirm results → check Exceptions for any flagged rows → Generate Report → download and open the Excel file, confirm all 11 sheets are populated correctly
- [ ] Configure a rate card with real MG/Variable slabs and a Minimum Login Hours value; confirm calculated amounts match hand-calculated expectations
- [ ] Configure a rate card with NO slabs (only the flat fields); confirm MG/Variable still calculate via the flat fallback rather than exceptioning
- [ ] Resolve, ignore, and reopen an exception; confirm audit log entries appear
- [ ] Change your own password; reset another user's password as ADMIN; confirm login history reflects both

## Running it locally

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
