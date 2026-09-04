# Payout Calculator Amazon

A static, browser-only tool that computes weekly rider arrear payouts (MG / Var / F+V,
including tiered slabs and EPH balancing) from your uploaded rate-card and activity files.
Nothing is uploaded anywhere — all parsing and calculation happens in the visitor's browser.

## Files

- `index.html` — page shell, loads the two files below
- `styles.css` — all styling
- `app.js` — all logic: file parsing, the MG/Var/F+V calculation engine, the Considered
  rules engine, duplicate/new-store checks, and the .xlsx export

There is no build step and no server code. Editing behavior means editing `app.js` directly.

## Run it locally

You can just double-click `index.html` to open it in a browser — no install needed.
(If your browser blocks local file access for the CDN scripts, run a tiny local server
instead: `python3 -m http.server 8000`, then open `http://localhost:8000`.)

## Deploy to Vercel (free, permanent)

1. **Create a GitHub repo.**
   - Go to github.com &rarr; New repository &rarr; name it (e.g. `arrear-payout-console`) &rarr; Create.
2. **Push these three files to it.**
   ```bash
   git init
   git add index.html styles.css app.js README.md
   git commit -m "Initial arrear payout console"
   git branch -M main
   git remote add origin https://github.com/<your-username>/arrear-payout-console.git
   git push -u origin main
   ```
3. **Import into Vercel.**
   - Go to vercel.com &rarr; sign in with your GitHub account &rarr; "Add New..." &rarr; "Project".
   - Select the repo you just pushed.
   - Framework Preset: choose **"Other"** (it's a plain static site, no build step needed).
   - Leave Build Command and Output Directory blank.
   - Click **Deploy**.
4. **You're live.** Vercel gives you a permanent URL like `arrear-payout-console.vercel.app`.

## Making changes later

Any time you edit `app.js` (fix a formula, add a rule, change a threshold) and push to
GitHub (`git add -A && git commit -m "..." && git push`), Vercel automatically rebuilds
and redeploys — usually within 30 seconds. No manual redeploy step.

## Where things live

- **Weekly data** (RC, Orders, Login Hours, Valinor Added Data) — exactly four uploads on
  the Upload tab. Conditions, Var Conditions, and F+V Conditions are generated
  automatically from the RC workbook the moment you pick the week's tab; nothing else to
  upload for those.
- **Considered Rules** (the Y/N payout classification table) is saved in the browser's
  local storage automatically, so it persists between visits on the same computer/browser.
  Use the **Export rules (.json)** button on the Rules tab to back it up or move it to
  another machine — **Import rules (.json)** loads it back in.
- **MG-type hub rates** (Min Orders / MG Amount) are also remembered automatically in the
  browser's local storage after every run. RC doesn't reliably store these for MG-type
  hubs, so the app carries forward whatever it saw last time it had good data for a given
  hub, without needing a separate "last week's file" upload. The very first time you run
  it (empty memory), any MG hub RC leaves blank shows up as a review item asking you to
  fill it in once — after that, it's remembered automatically. Note this memory is
  per-browser; switching computers means those few hubs need a one-time manual entry again
  (easy to do directly in the editable Conditions table on the Review Rates tab).

## The flow

1. **Upload Data** — RC workbook (pick the week's tab), Orders, Login Hours, Valinor Added
   Data. Conditions/Var Conditions/F+V Conditions generate automatically as soon as the RC
   tab is selected.
2. **Review Rates** — the generated Conditions table (top) and Var Conditions table
   (below it) are both directly editable — click any cell and change it. Also shows
   anything flagged during generation, duplicate hub entries, and new stores not yet in
   Conditions.
3. **Considered Rules** — edit the Y/N payout classification rules, then run the
   computation from here.
4. **Results** — MG / Var / F+V tables, totals, and the downloadable `.xlsx`.

## Generating Conditions from RC — reliability notes

- **V-type and F+V/F+V1/F+V2/F+V3-type hubs**: fully reliable — derived directly from RC's
  order-threshold and payout columns, including the tiered ladders. Validated against real
  data with zero mismatches.
- **MG-type hubs**: partially reliable. MG Amount and Var Pay usually come straight from
  RC (about 85% of hubs in testing); **Min Orders is not reliably stored in RC at all**
  for MG-type hubs — it always relies on the browser-memory carry-forward described above.

Anything the generator isn't confident about — a missing rate, a non-numeric RC cell, a
carried-forward value — is never silently guessed. It shows up as a review item on the
**Review Rates** tab so you can verify or correct it before computing.

## Known limitations to test against your real data

- EPH Balancing thresholds are read per-hub from the Conditions file's `EPH Eligible`,
  `EPH Min Hours`, `EPH Min Orders`, and `EPH Amount` columns. If your Conditions file
  doesn't have these columns yet, EPH defaults to *not eligible* for every hub.
- F+V / F+V1 / F+V2 / F+V3 tiers must be supplied via the new **F+V Conditions** file
  (same shape as Var Conditions: hub_name, RC Type, O1–O7, Amt1–Amt7). This table didn't
  exist before — you'll need to build it once from the RC.
- The Considered Rules list is a starting point seeded from real patterns found in past
  Valinor data. Any payout title that doesn't match a rule is excluded and flagged on the
  Results tab and the Rules tab — check that list every week until it stabilizes.
