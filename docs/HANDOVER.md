# Project handover

**Snapshot date:** 2026-10-02 · **Stage:** Validation / pre-build (BRD) · **App:** clickable prototype on sample data

This is the one document to read to pick the project up cold. It says what exists, what is done, what is
not, and exactly what to do next. Anything that needs a person's decision is marked **OWNER**.

> **Public repository.** Never put participant names, real finances, pricing strategy, secrets or the BRD/PRD
> files in this repo. They live outside it (`docs/source/`, `docs/private/`, `*.docx`, `*.pdf` are git-ignored).

---

## 1. In one minute

- **What it is:** a mobile-first cash-flow planner for UAE residents. The headline answer is **"how much can I safely
  spend until payday?"**, with every number explainable. It is not primarily an expense tracker.
- **Where we are:** a large **clickable prototype** exists and runs in Expo Go. It uses **made-up sample data held in
  memory**: nothing is saved or sent. There is no backend, no accounts and no real forecast engine yet.
- **The gate:** the BRD says **do not build Phase 2 (accounts, database, real engine) until 20 to 30 interviews show
  recurring demand.** Those interviews have **not started**. That is the single most important next step.
- **Engineering health:** all work went through pull requests with CI. `main` is protected. 258 automated tests pass.
- **One time-limited risk:** a security exception (node-forge) **expires 2026-11-01** (section 7).

---

## 2. What has been done

### Foundation (Phase 0)

| Item | Status | Where |
|---|---|---|
| Public GitHub repo, docs skeleton, agent rules | **Done** | `AGENTS.md`, `docs/` |
| Expo SDK 57 + strict TypeScript app, lint, format, tests | **Done** (PR #1) | `mobile/` |
| CI: format, lint, typecheck, tests + coverage, `expo-doctor`, bundle build, dependency audit and review, CodeQL | **Done** (PR #2) | `.github/workflows/` |
| Dependabot, secret scanning with push protection | **Done** | repo settings, `.github/dependabot.yml` |
| Branch protection on `main` and `staging` (PR required, 3 checks, admins included, linear history, no force push) | **Done**, verified with a test PR (PR #3) | repo settings |
| Environment config with a visible non-production banner | **Done** (PR #14), code half only | `mobile/src/config/environment.ts` |
| Separate Supabase projects (dev, staging, production) | **Not done. OWNER.** Wait for the gate | not created |
| E2E smoke test (Maestro) | **Written, never run** (needs a phone or emulator) | `mobile/.maestro/smoke.yaml` |

### The prototype (Phase 1)

Five tabs plus supporting screens. All numbers are hand-verified in tests.

| Area | What it does |
|---|---|
| **Overview** | Safe to spend until payday, daily safe amount, expected balance, upcoming bills, warnings, a day-by-day balance chart with a kept-aside line (and table view), a stacked "where your money goes" bar, a what-if purchase scenario, and an explanation screen for every headline number |
| **Spending** | Everyday budgets with a written status (on track, ahead of pace, over budget), monthly cost by type, Salik / parking / fuel together, room left for dining and shopping, 6-cycle trend |
| **Savings** | Goals with deadline checks, emergency fund in months of essential spending, a big-bills planner (monthly amount to be ready on time), unallocated monthly surplus, an **illustrative** gratuity estimate, 6-cycle trend |
| **Income** | Income by source, predictable vs irregular, money arriving in the next 60 days, how steady income is, income and net trends |
| **Insights** | Short, neutral notes (shortfall, budget over, big bill coming, small emergency fund...) that open the screen with the numbers |
| **Editing** | Add, edit and delete income, bills, everyday budgets and goals, using **30 standard UAE categories** (rent, chiller, DEWA, du / e&, Salik, parking, fuel, school fees, nanny, money sent home, car registration, visa fees...). Edits change the forecast immediately |

Design rules baked in: money as integer fils; centralised strings and design tokens; written status and symbols,
never colour alone; 48px touch targets; accessible error messages; no shame-based wording; privacy-minimised
analytics (allow-listed events only, no financial values).

### Quality and security

- **258 tests in 17 suites:** domain maths, edit and journey flows through every screen, charts, analytics privacy,
  the audit gate and the exception watch.
- **A code review found and fixed 10 bugs** (PR #34), the worst being that "payday today" showed the whole salary as
  one day of spending money.
- **Dependency policy:** CI fails on any high or critical production advisory. One advisory has an approved,
  expiring exception (section 7). A weekly workflow reminds the owner by GitHub issue.

### Research and planning documents

- Interview kit, one-page guide and prototype walkthrough (`docs/INTERVIEW-*.md`, `docs/PROTOTYPE-WALKTHROUGH.md`).
- Seven hypotheses H1 to H7 (`docs/VALIDATION.md`).
- ADR 0004: proposed answers to the PRD open decisions (**still Proposed**).
- `docs/FEATURE-GAP.md`: competitor research with sources, risks and roadmap (vendor marketing, not independently tested).

---

## 3. What was learned (read before deciding anything)

1. **UAE categories are table stakes.** YooToo, a UAE app, already offers Salik, Nol, DEWA and school-fee categories
   and a month-end projection. They are not a differentiator.
2. **Automatic capture is common in the UAE.** YooToo imports PDF statements from major UAE banks; FinArt reads SMS,
   email and PDFs without a bank login. This prototype is **manual entry only**, which is the biggest adoption risk.
3. **Privacy positioning matters.** YooToo markets on-device data with no account; FinArt offers an on-device mode.
   The BRD plans a cloud database. That is a trust trade-off to decide on purpose.
4. **What may still set this app apart** (unproven): the payday-cycle safe-to-spend figure with its formula visible, an
   isolated what-if, yearly and termly bills turned into a monthly set-aside, awareness of irregular income, and
   emergency cover in months. The pages checked did not mention these. Interviews must show whether people care.

---

## 4. Current technical state

| Topic | State |
|---|---|
| Repo | `github.com/ahmadal7aj-hub/cashflow-planner` (public), default branch `main` |
| Branches | `main` (protected), `staging` (protected, **unused and 23 commits behind**, no deploy pipeline yet) |
| Stack | React Native + Expo SDK 57, TypeScript strict, Expo Router, npm. No backend yet |
| Entry points | `mobile/src/app/` (screens), `mobile/src/domain/` (pure maths), `mobile/src/state/` (in-memory plan) |
| Required PR checks | Quality, Security (dependencies), CodeQL |
| Reviews required | 0 (single maintainer; GitHub does not let you approve your own PR). Raise to 1 when a second person joins |
| Release | Nothing is deployed or published. No app-store identifiers chosen, deliberately |
| Machine notes | Windows. Use `npm.cmd` / `npx.cmd` if PowerShell blocks scripts. Free RAM is low (about 3 GB), so no Android emulator |

See `docs/ARCHITECTURE.md` for the structure and `docs/TESTING.md` for how to run the checks.

### Known limitations (be honest about these)

- **Prototype only.** Sample data, in memory, nothing persists. Closing the app resets everything.
- **The forecast maths is prototype maths** (`prototypeForecast.ts`, version `prototype-0.1`). The real, versioned,
  property-tested engine is Phase 3.
- **The gratuity estimate is not legally verified.** It is labelled illustrative and must get a UAE legal check.
- **No screenshots exist in the PRs, and the layout has only been looked at on one phone** (by the owner). Bar
  proportions and text wrapping on small screens are unverified.
- **Maestro E2E has never been run.**
- **Competitor data** is vendor marketing; Monarch prices and Wally's own site were not captured.
- The planning-horizon rule ("until the day before next payday", capped at 62 days) is an assumption, ADR 0003.

---

## 5. Decisions

| Decision | Status |
|---|---|
| Public repo with private business documents kept outside it | **Decided** |
| Stack (Expo, TypeScript, npm; Supabase later) | **Decided** (ADR 0002) |
| Planning horizon for the prototype | **Decided for the prototype** (ADR 0003); revisit after interviews |
| Eight PRD open decisions (name, horizon, safety buffer, accounts, import, pricing, minimum age, hosting region) | **Proposed, awaiting OWNER** (ADR 0004). Item 5 (import) was revised to "likely table stakes" |
| **Cloud, on-device, or hybrid data storage** | **Open. OWNER.** New, raised by the research. Needed before Phase 2 |
| Node-forge security exception | **Approved by OWNER 2026-10-02**, expires 2026-11-01 |
| Product name, pricing, minimum age, data-hosting region | **Open**, deliberately postponed (legal review, evidence) |

---

## 6. Next actions

Work in this order. Do not skip ahead: Phase 2 is gated on step 4.

### A. This week (all OWNER)

| # | Action | Done when |
|---|---|---|
| 1 | **Click through the prototype in Expo Go** (follow `docs/PROTOTYPE-WALKTHROUGH.md`) | You have a list of anything confusing, ugly or wrong, with screen names or screenshots |
| 2 | **Send that list to Claude** | Issues are fixed in small PRs |
| 3 | **Confirm or change the eight proposals in ADR 0004**, and decide the cloud vs on-device question | Each item marked Accepted or changed |

### B. Weeks 1 to 3: validation (OWNER)

| # | Action | Done when |
|---|---|---|
| 4 | **Recruit five people** who are salaried UAE residents with recurring bills (mix: expat and Emirati, single and family, iPhone and Android) | Five sessions booked |
| 5 | **Run the sessions** using `docs/INTERVIEW-ONE-PAGER.md` and the walkthrough script; record private notes in `docs/private/` only | Five anonymous note sheets |
| 6 | **Summarise the first five against H1 to H7** (ask Claude to help) and decide whether to continue | A written finding per hypothesis |
| 7 | **Continue to 20 to 30 interviews and at least 10 usability sessions** | The BRD exit gate is met |

### C. Dated items

| Date | What | Action |
|---|---|---|
| Weekly (Mondays) | Automatic exception watch | Read the GitHub issue if one is opened |
| **about 2026-10-26** | Exception is within 7 days of expiring | **OWNER** decides: renew 30 days (Claude edits the file only on your explicit approval) or let it expire |
| **2026-11-01** | **node-forge exception expires; CI fails again** unless fixed or renewed | If a fixed version exists, upgrade and delete the exception |

### D. After the gate (only if interviews show demand): Phase 2 plan

1. **OWNER:** create Supabase dev, staging and production projects; decide the data-hosting region with UAE counsel.
2. **OWNER:** obtain a UAE legal read on PDPL, privacy wording, the gratuity estimate and whether any insight reads as advice.
3. Decide import (PDF/CSV) and the cloud/on-device question; record an ADR.
4. Build in the PRD ticket order: P0-02 environments, then P2-01 auth with tests, schema with RLS and cross-user denial
   tests, P2-02 financial profile, P2-03 commitments CRUD, P2-05 dashboard v1 using fixture-approved numbers.
5. Replace the prototype maths with the Phase 3 engine (P3-01 to P3-05), versioned and property-tested.
6. Then Phase 4 planning, Phase 5 beta hardening (notifications, export and delete, monitoring, backups), and only
   after pricing validation Phase 6 monetisation. Phase 7 bank connectivity needs its own legal go/no-go.

### E. Housekeeping and backlog (Claude can do these on request)

- Run the Maestro E2E flow once on a USB-connected Android phone.
- Add screenshots and an accessibility pass; check small-screen layout.
- Mirror the BRD and PRD into `docs/BRD.md` and `docs/PRD.md` **privately**, if wanted.
- Complete the competitor teardown: install the apps, capture Monarch prices, read Wally's own site.
- Promote `main` to `staging` only once a staging deploy pipeline exists.
- Candidate features by interview evidence: automatic import, multi-currency and remittances, post-dated rent-cheque
  schedule, seasonal planning (DEWA summer, Ramadan, school terms), debt-payoff planner, household sharing. See
  `docs/FEATURE-GAP.md`. **None of these should start before the gate.**

---

## 7. The time-limited security exception

- **What:** advisory GHSA-86w9-cpqp-85rv in `node-forge` (up to 1.4.0). **No patched version exists** (1.4.0 is the
  latest). It is reached only through Expo's build tooling; the app code does not import it and the built bundle
  contains no trace of it. No update code-signing is configured.
- **Approved by the owner on 2026-10-02**, for 30 days, for this one advisory only. Recorded in
  `mobile/audit-exceptions.json`. CI prints it on every run.
- **After expiry CI fails again.** Renewal needs the owner's explicit approval; never extend it silently.
- **Reminders:** `.github/workflows/exception-watch.yml` runs weekly and opens or comments on a GitHub issue assigned
  to the owner when a fix appears or expiry is within 7 days. GitHub can pause scheduled workflows after 60 days
  without repository activity, so re-enable them if that happens.
- Process: `docs/SECURITY.md`.

---

## 8. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Manual entry loses to auto-import apps** | Several UAE competitors capture data automatically | Test import demand in every interview (H6); decide import before Phase 3 |
| **Cloud vs on-device trust** | A competitor markets on-device-only data | Decide deliberately; ask interviewees (H7) |
| **Building before demand** | The BRD's top risk | Hold Phase 2 until the gate |
| **Crowded UAE market** | At least five UAE-focused apps | Validate the differentiators in section 3 before building more |
| **Wrong or advice-like numbers** | Loss of trust, possible regulatory scope | Deterministic tested engine; legal review of wording and the gratuity estimate |
| **Sensitive data in a public repo** | Public repository | Private docs git-ignored; secret scanning and push protection on; check `git diff --cached` before every commit |
| **Security exception lapses unnoticed** | CI blocks all work | Weekly watch, dated item in section 6C |
| **Single maintainer** | No second review | Automated gates; add a reviewer when possible |

---

## 9. How to run and work

```powershell
cd mobile
npm.cmd ci            # first time only
npm.cmd start         # scan the QR code with Expo Go
npm.cmd run check     # format + lint + typecheck + tests (what CI runs)
node scripts/audit-gate.js   # the dependency audit gate
```

- **Expo Go sign-in:** this SDK needs Expo Go and the Expo CLI signed in to the **same** Expo account. If you signed
  up with Google, Apple or GitHub, set a password on expo.dev first, then `npx.cmd expo login`.
- **Working rules** (`AGENTS.md`): work on a short-lived branch, open a PR, wait for all three checks, then squash
  merge. Never push to `main`. Never disable tests, scans or branch protection. Small PRs with requirement IDs.
- **When asking Claude to continue,** start from this file. Useful requests: "fix these issues from Expo Go",
  "summarise my first five interviews against H1 to H7", "check the node-forge status", "start Phase 2 planning".

---

## 10. Where things are

| Need | Location |
|---|---|
| Product and requirements (private) | the BRD and PRD `.docx` files, outside the repo |
| Rules for coding agents | `AGENTS.md` and `mobile/AGENTS.md` |
| Architecture, testing, release, security, privacy | `docs/ARCHITECTURE.md`, `TESTING.md`, `RELEASE.md`, `SECURITY.md`, `PRIVACY-DATA-MAP.md` |
| Decisions | `docs/adr/` (0001 to 0004) |
| Research and interviews | `docs/VALIDATION.md`, `INTERVIEW-KIT.md`, `INTERVIEW-ONE-PAGER.md`, `PROTOTYPE-WALKTHROUGH.md`, `FEATURE-GAP.md` |
| Private interview notes | `docs/private/` (git-ignored; never commit) |
| Change history | `CHANGELOG.md` and the closed pull requests |
| Security exception | `mobile/audit-exceptions.json`, `mobile/scripts/` |

## 11. Glossary

- **Safe to spend:** cash plus expected income, minus bills due before payday, savings set aside, the safety buffer and
  expected everyday essentials. Never shown below zero; a shortfall is shown separately.
- **Everyday budget:** a monthly budget you spend against (groceries, Salik, dining). Essentials are set aside;
  non-essentials are funded from safe to spend.
- **Pay cycle:** payday to payday. Budgets and "spent so far" run on this cycle.
- **Fils:** 1/100 of a dirham. All money is stored as whole fils to avoid rounding errors.
- **Gate:** the BRD rule that Phase 2 waits for interview evidence of demand.
- **ADR:** architecture decision record, one short file per material decision.
