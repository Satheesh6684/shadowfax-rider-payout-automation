# Shadowfax Rider Payout Arrears Management System
## Phased Implementation Plan (derived from SRS v1.1)

> Formulas for MG, Variable Pay, F+V, Weekly/Order/Special Incentive, and Arrears are explicitly deferred by the SRS. Every phase below builds the architecture to plug those in later — none of them are invented here.

---

### Phase 0 — Foundation
No business features yet; everything below depends on it.
- Repo scaffold: `/frontend` (Next.js + TS + Tailwind + shadcn/ui), `/backend` (Express + TS, Repository + Service layers), `/prisma`
- Prisma schema, normalized, for: `users`, `cities`, `stores`, `weekly_rate_cards`, `rc_conditions`, `special_incentives`, `payment_configuration`, `uploaded_orders`, `uploaded_login_hours`, `uploaded_payments`, `rider_master`, `rider_calculations`, `rider_history`, `generated_reports`, `audit_logs`
- Auth: single admin login (Phase 1 scope per §6), session/JWT middleware, `user_roles` table stubbed for future RBAC
- Centralized error handler (§18), centralized validation middleware (§17), reusable `AuditLogService`
- App shell: sidebar (Rate Card / Payment Configuration / Upload Center / Calculation Engine / Rider Search / Reports / Settings), **no dashboard route**, logo links to Rate Card

### Phase 1 — Module 1: Rate Card Management (home page)
- Weekly versioning: create-week flow with "copy previous week?" prompt (§13.4)
- Backend: rate-card service/repository, CRUD APIs (§16), version history table
- Frontend: week selector, rate card table, store details drawer (§13.9 card stack), read-only/edit mode toggle, special incentives sub-module
- Validation (§13.14) + audit logging (§13.15) wired end-to-end

### Phase 2 — Module 2: Payment Configuration
- Valinor upload parser (SheetJS) — category detection only, **no calculation**
- Auto-detected payment category list with Yes/No include toggle, weekly versioning, past-week edit lock (§14.12)

### Phase 3 — Module 3: Upload Center
- Orders / Login Hours / Valinor upload cards with schema validation per §28
- Reject-entire-file-on-any-error (no partial imports), replace-upload confirmation + archiving, upload history table

### Phase 4 — Module 4: Review & Validate
- Validation summary aggregator pulling from Rate Card + Payment Config + all three uploads
- Checks from §25 with green/yellow/red indicators; **Run Calculation stays disabled** until clean

### Phase 5 — Module 5: Calculation Engine (architecture only)
- Strategy interface + registry: MG / Variable Pay / F+V / Weekly Incentive / Order Incentive / Special Incentive / Arrear / Exception strategies (§30)
- Pipeline orchestrator following the exact §31 sequence
- Each strategy stubbed to raise "formula not yet defined" so the wiring is verifiable without inventing payout logic
- Data grouping layer (§29)

### Phase 6 — Module 6: Reports
- Report generation service — Excel (multi-sheet per §32), CSV, PDF
- Versioned report history, never overwritten

### Phase 7 — Module 7: Rider Search & Exceptions
- Search by Rider ID / Name / Store / City; rider detail aggregation (history, calculations, orders, login, payments, audit timeline) per §33
- Exceptions module (§34) with severity + suggested resolution

### Phase 8 — Cross-cutting hardening
- Pagination/indexing for 100k+ records, query performance pass
- RBAC scaffolding for future roles, Settings page, non-functional checklist from §22

---

**After each phase**, I'll report: completed features, remaining SRS requirements, and any assumptions made — with payout formulas staying an explicitly documented placeholder rather than something invented.
