# Shadowfax Amazon Rider Payout Arrears Management System

Phase 0 foundation, built from the SRS v1.1. This is the scaffold every later
module plugs into — not yet the Rate Card / Payment Configuration / Upload
Center modules themselves (those are Phases 1–7, see
`Shadowfax_Implementation_Plan.md`).

## What's actually here

**Backend** (`/backend` — Node.js + Express + TypeScript + Prisma/MySQL)
- Prisma schema covering the core tables from SRS §15.3, with weekly
  versioning and history/audit tables built in from day one
- Centralized error handling (`middleware/errorHandler.ts`) that never leaks
  stack traces to the client
- Centralized Zod validation (`middleware/validate.ts`)
- JWT auth (`middleware/auth.ts`) with a working `/login`, `/logout`,
  `/profile` — single admin login per SRS §6, shaped so role-based access
  can be added later without touching existing routes
- `AuditLogService` — the one write path every future module should log
  through
- Repository-pattern interface (`repositories/base.repository.ts`) that
  Phase 1's `RateCardRepository` etc. will implement

**Frontend** (`/frontend` — Next.js 14 + TypeScript + Tailwind)
- App shell: `Sidebar` (exact module order from SRS §10), sticky `Header`
  with a global search field and the `WeekPill` — an always-visible chip
  showing the operating week, since every module in this SRS is week-scoped
- No dashboard route — `/` redirects straight to `/rate-card`, matching
  SRS §9
- `lib/api-client.ts` — single fetch wrapper the whole app will use, already
  handling the backend's `{ success, data }` response envelope and turning
  failures into a typed `ApiError`

Both `npm install` and `next build` were run against this scaffold to verify
it's not just syntactically plausible — it actually installs and compiles.
`prisma generate` could **not** be verified in the sandbox this was built in
(no route to `binaries.prisma.sh`) — run it yourself once you have the repo
locally, it should work normally in most environments.

## Running it locally

```bash
# Backend
cd backend
cp .env.example .env   # fill in a real MySQL DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev             # http://localhost:5000

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev              # http://localhost:3000
```

There's no seed script yet, so `/login` will 401 until a `User` row exists —
Phase 1 will likely want a small seed script alongside the first admin
account setup.

## What's next

See `Shadowfax_Implementation_Plan.md` for the full phase breakdown. Phase 1
is Rate Card Management — the home page and the module every calculation
downstream depends on.
