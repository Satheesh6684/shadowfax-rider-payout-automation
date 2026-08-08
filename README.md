# Shadowfax Amazon Rider Payout Arrears Management System

Pre-deployment audit completed this phase. This README reflects the
current state only.

## This phase: pre-deployment audit for Vercel + Render + TiDB Cloud

**One real bug found and fixed** — and it's worth being upfront about how:
`user.service.ts` imported `CreateUserInput`/`UpdateUserInput` from
`user.validators.ts`, but those types were never actually exported there
(only the zod *schemas* were). This is a genuine `TS2305` compile error
that should have been caught immediately when User Management was first
built. It survived several "clean" verification passes in earlier phases
because my own filtering pattern (excluding lines containing "has no
exported member") was too broad — it was written to filter out the known
Prisma-generation cascade, but this bug's error message happened to share
the same phrase for an unrelated reason. Running the *actual* `npm run
build` command (not just `tsc --noEmit --skipLibCheck`) during this audit,
and reading the full unfiltered output line-by-line instead of trusting
the filter, is what caught it. Fixed by exporting the inferred types,
matching the pattern used in every other validators file. Re-verified with
a precise filter (matching only the literal generated-client path, plus
manual spot-checks confirming every remaining implicit-any error is
genuinely downstream of the same Prisma-generation gap) — 78 remaining
build errors, all explained, zero unaccounted for.

**Critical deployment-blocking fix**: `package.json`'s `build` script never
ran `prisma generate`. On Render, `npm install` would have left
`@prisma/client` as the unconfigured stub package (no models matching the
actual schema) — the deployed app would crash on its very first database
query. Added `"postinstall": "prisma generate"`, the standard pattern for
exactly this class of platform. Verified the script wiring triggers
correctly; the actual generation still can't complete *in this sandbox*
specifically (no route to `binaries.prisma.sh` — the same limitation noted
in every phase of this project), but that's a sandbox network restriction,
not a configuration problem, and won't apply on Render's real infrastructure.

**No `.gitignore` existed anywhere in the project until now.** Since the
repo has already been pushed to GitHub, I can't see from here whether
`node_modules` or a real `.env` file got committed in an earlier commit —
added a proper `.gitignore` now, but **you should check the actual GitHub
repo** (`git log --all --full-history -- "**/node_modules" ".env"` locally,
or just browse the repo) and remove/purge anything sensitive that's
already there. A `.gitignore` added now only prevents *future* commits
from including these — it doesn't retroactively clean history.

**No migrations exist** — `prisma migrate dev` has never successfully run
against a real database in this sandbox (same network restriction). This
means `prisma migrate deploy` (the standard production migration command)
would have nothing to apply. Two paths forward, documented in Environment
section below: generate migrations locally first, or use `prisma db push`
directly against TiDB Cloud as a simpler initial-setup alternative.

**Added `render.yaml`** — codifies root directory (`backend`), build
command, start command, and required env var names, so Render's setup
needs zero manual dashboard configuration beyond pasting in the actual
secret values.

**Enhanced both `.env.example` files** with deployment-specific guidance —
notably TiDB Cloud's TLS requirement (`?sslaccept=strict` in the connection
string), which is a common, easy-to-miss gotcha for exactly this database.

**Verified, not assumed**: fresh `npm install` + full production build on
both backend and frontend, ESLint clean, ~78 backend build "errors" fully
traced and explained (not just counted), lockfiles present for
reproducible installs, ~~next-env.d.ts~~ correctly left committed per
Next.js convention.

## Pre-deployment checklist (do these before deploying)

1. **Verify the GitHub repo doesn't already contain secrets/node_modules**
   from before this `.gitignore` existed (see above).
2. **Generate a Prisma migration** in an environment with real network
   access: `cd backend && npx prisma migrate dev --name init`, commit the
   resulting `prisma/migrations/` folder. Alternative: skip migrations
   entirely for now and run `npx prisma db push` directly against TiDB
   Cloud once `DATABASE_URL` is set — simpler for initial setup, but you
   lose migration history going forward.
3. **Render**: create a Web Service from this repo — `render.yaml` should
   auto-detect the config, or set manually: Root Directory `backend`,
   Build Command `npm install && npm run build`, Start Command
   `npm start`. Set `DATABASE_URL` (from TiDB Cloud, with `?sslaccept=strict`),
   `JWT_SECRET` (a real random string, not the placeholder), and
   `CORS_ORIGIN` (your Vercel URL, once known) as environment variables.
4. **Vercel**: import the repo, set Root Directory to `frontend` (Vercel
   auto-detects Next.js, no framework preset changes needed). Set
   `NEXT_PUBLIC_API_BASE_URL` to your Render backend URL + `/api`.
5. **After both are live**: run `npm run prisma:seed` against the
   production database once (creates the initial admin user) — either
   locally with `DATABASE_URL` pointed at TiDB Cloud, or via Render's shell.

## What's still genuinely incomplete (unrelated to deployment readiness)

Special Incentives (no formula ever given), RBAC read-endpoint gating,
forced password-change enforcement, zero automated tests. None of these
block deployment — they're feature-completeness gaps, not build/runtime
failures.

## Running it locally

```bash
# Backend
cd backend
cp .env.example .env
npm install   # postinstall runs `prisma generate` automatically
npx prisma migrate dev --name init   # or: npx prisma db push
npm run prisma:seed
npm run dev

# Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
