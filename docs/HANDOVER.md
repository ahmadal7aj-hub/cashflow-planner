# Project handover

**Snapshot date:** 2026-10-07 · **Stage:** Validation / pre-build (BRD) · **App:** working prototype with accounts, shared savings, chart dashboards and phone reminders (accounts need a backend the owner has not created yet)

This is the one document to read to pick the project up cold. It says what exists, what is done, what is
not, and exactly what to do next. Anything that needs a person's decision is marked **OWNER**.

> **Public repository.** Never put participant names, real finances, pricing strategy, secrets or the BRD/PRD
> files in this repo. They live outside it (`docs/source/`, `docs/private/`, `*.docx`, `*.pdf` are git-ignored).

---

## 0. Start here next session

**State (2026-10-07):** `main` has everything built so far: the app with saving on the phone, the adjustable what-if, and
accounts with groups, shared savings and chart dashboards (see "What was added since the first handover" below). CI is green and the earlier security block is cleared
(an owner-approved exception for the `braces` advisory, expiring **2026-11-01**, next to the `node-forge` one).
**Nothing in the app has been tried on a real phone by the assistant, and the backend has never run against a live
Supabase project.**

### Where things stand (2026-10-07)

- **Built and merged:** everything in the list below, through pull request #58. `main` is clean: no open pull requests or issues, 695 automated tests pass, all four required checks pass.
- **Verified by the owner on a phone (Expo Go and the local test server):** sharing between two accounts, the dashboards and the main flows, with no problems found. **Phone reminders were not reported as tested.**
- **Never done:** a real Supabase project (so no real emails and no live-backend check), interviews, a run of the Maestro flow.
- **The single next step is the owner creating the Supabase project** (`docs/BACKEND-SETUP.md`: run the four migrations in file order, put the URL and public key in `mobile/.env.local`, then `npm.cmd run backend:check`). Everything Claude can build next (fixes from the live project, weekly and monthly summary emails) depends on it.

### How to open the app on a phone (quick)

1. PowerShell: `cd C:UsersahmadProjectsBudgetingcashflow-plannermobile`, then `git pull`, then `npm.cmd start -- --clear`.
2. Wait for the QR code. iPhone: scan it with the Camera app. Android: Expo Go, Scan QR code. Same Wi-Fi (not guest Wi-Fi); Expo Go and the computer signed in to the same Expo account.
3. Only for two-account testing: in a second PowerShell window run `npm.cmd run dev:server` first and follow `docs/TEST-WITH-TWO-ACCOUNTS.md` (confirmation code is always 123456). Reload with a shake, then Reload.
4. If it will not connect: `npm.cmd start -- --tunnel`, or `npx.cmd expo login`.

### What was added since the first handover

- **Accounts:** sign up with username, email and password (email code to confirm), optional name and phone, sign in,
  reset password, sign out, and **delete my account** (removes the account, profile, memberships and shared savings from
  the server and this account's records from the phone; groups carry on for the others).
- **Profile:** a person icon at the top right of the main pages opens "My profile" (username, email, name, phone, send my
  username). Others find you by **username or email**; the phone number is private (it is not verified, so it is never
  used for lookup).
- **Sharing a saving:** on Add money, Take out and Edit saving choose **Keep private** or **Shared**. Shared offers a group
  you are in or **Someone new** (username or email): the app starts a group with that person, invites them, and they see
  the saving only after they accept. You can make it private again at any time.
- **Invite by email before they register:** inviting an email with no account stores a hash of it for 30 days; when somebody registers with that address it becomes a normal pending invitation they must accept. The inviter sees the same quiet answer either way.
- **Backend check:** `npm run backend:check` in `mobile/` (after putting the Supabase URL and anon key in `.env.local`) says which migrations are missing and warns if data is readable without signing in.
- **Dashboards tab:** one tab with Overview, Income, Budget, Spending, Savings and (once something is shared) Shared. Each
  opens with charts, then a Details card. One set of date buttons applies to every section.
- **Phone reminders:** Settings, Phone reminders (off by default; the phone asks permission when turned on). A notification at 9:00 on the day each bill reminder starts, naming the bill and due date, never an amount. Rebuilt whenever bills change, cancelled when turned off. Tested with a stand-in for the phone; **not yet seen on a real phone** (check that it fires, and that Expo Go on your phone allows local notifications).
- **Safer storage:** the sign-in session is kept in the phone's secure storage (Keychain or Keystore), split into pieces
  when long; an older session in plain storage moves over on first read.
- **Local test server:** `npm run dev:server` in `mobile/` runs the real database rules on the computer so two accounts
  can be tried without Supabase (`docs/TEST-WITH-TWO-ACCOUNTS.md`). Testing only: the code is always 123456.
- **Database migrations (run in file-name order):** `20261003000000_accounts_and_shared_savings`,
  `20261004000000_profile_name_phone`, `20261005000000_delete_my_account`, `20261006000000_pending_email_invites`. Each has a tested rollback in
  `supabase/rollback/`.
- **Checkpoint tags:** `checkpoint/pre-restructure-2026-10-03`, `checkpoint/pre-accounts-2026-10-03`,
  `checkpoint/pre-profile-fields-2026-10-03`, `checkpoint/pre-delete-account-2026-10-03`, `checkpoint/pre-pending-invites-2026-10-05`.

### Not done yet (and why)

- **An invitation email actually sent to someone with no account:** the invitation now waits for them (30 days) and the app offers a message to send, but the app itself cannot email them without the real email setup (Supabase SMTP).
- **Weekly or monthly summary emails:** same dependency (a scheduled job and an email sender).
- **Encrypting the saved plan on the phone:** only the sign-in session is in secure storage; the records are not encrypted.
- **Two-step login, a privacy review for UAE law, an email sender in the product's own name, abuse limits.**
- **Looked at on a real phone by the assistant:** never. The charts, sharing flow, profile, account deletion and phone
  reminders are covered by automated tests only. The owner has seen the chart dashboards and liked them.
- **Real Supabase project:** never created, so the backend has only run against the embedded test database.

### Ask the owner first

1. **Did you create the Supabase project** and follow `docs/BACKEND-SETUP.md`? What did the two-phone check show?
2. **Did you try the app in Expo Go** (empty start, Add item, budgets and spending, savings, swipe delete, dark mode)?
   What was confusing or ugly?
3. **Interviews:** have any happened? The BRD gate was overridden for accounts; the product still needs real demand evidence.
4. **Security exceptions:** a GitHub issue "Security exception needs attention" means a decision is due before 2026-11-01.

### Then, in this order

| #   | Next step                                                    | Owner                    | Notes                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Reset the test server and reload the app**                 | Owner                    | Stop the server, delete `mobile\.dev-data`, `npm.cmd run dev:server`, then `npm.cmd start -- --clear`. This picks up the new packages (`expo-secure-store`, `expo-notifications`) and the new database functions. Test accounts are lost; register again (code 123456) |
| 2   | **Test sharing with two accounts**                           | Owner                    | `docs/TEST-WITH-TWO-ACCOUNTS.md`. Add a saving, choose Shared, type the other username or email, accept, compare the Shared chart on both. Send screenshots of anything wrong                                                                                          |
| 3   | **Check phone reminders on a phone**                         | Owner                    | Settings, Phone reminders, then give a bill a reminder for tomorrow and see whether it arrives at 9:00. Tell Claude if Expo Go blocks it                                                                                                                               |
| 4   | **Create the Supabase project and run the three migrations** | Owner                    | `docs/BACKEND-SETUP.md`. Run `supabase/migrations/` in file-name order. Until then the app uses the local test server or runs on its own                                                                                                                               |
| 5   | **Fix what the live backend and real phones show**           | Claude                   | Likely: email codes and rate limits, Realtime delivery, `supabase-js` on a phone, chart layout on small screens, swipe feel                                                                                                                                            |
| 6   | **Weekly and monthly summary emails**                        | Claude, after step 4     | Needs a scheduled job and the email sender                                                                                                                                                                                                                             |
| 7   | **Before any real users**                                    | Both                     | Encrypt the saved plan, 2FA, own email sender, UAE PDPL review and privacy notice, abuse limits                                                                                                                                                                        |
| 8   | **Interviews** (five first, then 20 to 30)                   | Owner                    | `docs/INTERVIEW-ONE-PAGER.md`, `docs/PROTOTYPE-WALKTHROUGH.md`; private notes only in `docs/private/`                                                                                                                                                                  |
| 9   | **Security exception window**                                | Owner decides            | Renew-or-expire decision around 2026-10-26; check `npm view braces version` and `node-forge`                                                                                                                                                                           |
| 10  | **Run the Maestro flow** on a USB-connected Android phone    | Owner provides the phone | Written, never run. It replaces saved data, so use a test phone. Updated 2026-10-05 for the Dashboards tab; it runs with accounts off (no `.env.local`)                                                                                                                |
| 11  | **Ideas, only if interviews support them**                   | Both                     | Import from bank statements, multi-currency, personal records on a second phone                                                                                                                                                                                        |

### Ready-to-paste prompt to resume

> Read `docs/HANDOVER.md` (section 0 first), then check `git status`, open PRs and issues. Here is what happened with the
> Supabase check and my phone test: (paste results or screenshots). Fix problems first, one small PR at a time, then tell me
> what is next.

### Working notes for the assistant

- **Workflow:** short-lived branch, small PR, wait for the three required checks, squash merge. Always verify the PR number,
  author, branch and that CI ran on the latest commit. Never push to `main`. Never weaken a scan or branch protection; adding
  an expiring audit exception needs explicit owner approval.
- **Windows tooling:** write long files with the Write tool (the Bash tool fails to parse long heredocs that contain
  apostrophes); use PowerShell for `npx` and `node`; use `git commit -F` with a message file; `npm.cmd` if scripts are blocked.
- **Tests:** `openApp` for screens, `openAccountsApp` and `accountScenario` for accounts, `startTestDb` for real-SQL tests.
  The router test library can carry a previous test's route into the next one after long journeys: keep those in their own file.
- **Money:** integer fils only; all maths in `mobile/src/domain/`; the database computes shared totals (`group_savings_summary`).
- **Formatting:** CI runs `prettier --check .` over the whole `mobile/` folder (including `app.json`); run `node node_modules/prettier/bin/prettier.cjs --check .` before pushing, not just `src`.
- **Test tips:** after a sign-in the app returns to the welcome page on a timer, so tests call `settle(db)` before navigating; `toHaveTextContent("text")` matches the whole text, use a regex for part of it.
- **Checkpoints and rollback:** `docs/ROLLBACK.md` (tags `checkpoint/pre-restructure-2026-10-03`, `checkpoint/pre-accounts-2026-10-03`, `checkpoint/pre-profile-fields-2026-10-03`, `checkpoint/pre-delete-account-2026-10-03`).
- **Public repo:** never commit the BRD/PRD, interview notes, secrets or the Supabase keys (`.env.local` is git-ignored).

---

## 1. In one minute

- **What it is:** a mobile-first cash-flow planner for UAE residents. The headline answer is **"how much can I safely
  spend until payday?"**, with every number explainable. It is not primarily an expense tracker.
- **Where we are:** a **working prototype** runs in Expo Go. Tabs: **Dashboards** (Overview, Income, Budget, Spending,
  Savings and, once something is shared, Shared, each with charts), Income, Savings planning, Budgeting and Actual
  spending. A new user starts empty. **Personal records are saved on the phone only** (ADR 0005); only savings the user
  chooses to share go to a server (ADR 0006, hybrid). Accounts, groups, sharing by username or email, a profile, account
  deletion and phone reminders are built. **The backend has never run on a real Supabase project**: the owner still has to
  create one (`docs/BACKEND-SETUP.md`); meanwhile the local test server (`docs/TEST-WITH-TWO-ACCOUNTS.md`) runs the same
  database rules on the computer. To undo any step see `docs/ROLLBACK.md` and the checkpoint tags listed in section 0.
- **The gate:** the BRD says **do not build Phase 2 (accounts, database, real engine) until 20 to 30 interviews show
  recurring demand.** Accounts and sharing were built ahead of the gate at the owner's request (ADR 0006). The interviews have **not started**, so demand for the product is still unproven. That remains the most important next step for the business.
- **Engineering health:** all work went through pull requests with CI. `main` is protected. 680 automated tests in 56 suites pass; 56 pull requests have been merged.
- **One time-limited risk:** a security exception (node-forge) **expires 2026-11-01** (section 7).

---

## 2. What has been done

### Foundation (Phase 0)

| Item                                                                                                              | Status                                             | Where                                   |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| Public GitHub repo, docs skeleton, agent rules                                                                    | **Done**                                           | `AGENTS.md`, `docs/`                    |
| Expo SDK 57 + strict TypeScript app, lint, format, tests                                                          | **Done** (PR #1)                                   | `mobile/`                               |
| CI: format, lint, typecheck, tests + coverage, `expo-doctor`, bundle build, dependency audit and review, CodeQL   | **Done** (PR #2)                                   | `.github/workflows/`                    |
| Dependabot, secret scanning with push protection                                                                  | **Done**                                           | repo settings, `.github/dependabot.yml` |
| Branch protection on `main` and `staging` (PR required, 3 checks, admins included, linear history, no force push) | **Done**, verified with a test PR (PR #3)          | repo settings                           |
| Environment config with a visible non-production banner                                                           | **Done** (PR #14), code half only                  | `mobile/src/config/environment.ts`      |
| Separate Supabase projects (dev, staging, production)                                                             | **Not done. OWNER.** Wait for the gate             | not created                             |
| E2E smoke test (Maestro)                                                                                          | **Written, never run** (needs a phone or emulator) | `mobile/.maestro/smoke.yaml`            |

### The prototype (Phase 1)

Five pages plus supporting screens. All numbers are hand-verified in tests.

| Area                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboards**                        | One tab with a button row: **Overview, Income, Budget, Spending, Savings** and **Shared** (only once something is shared). Each opens with charts then a Details card: money in, spent and saved; budget used with a percentage; month by month columns; savings balance per month; budget and spending by category; income by source. One set of date buttons (this month, last week, last month, last quarter, last year, typed custom range) applies to every section. The Overview keeps the old summary cards, the safe-to-spend card, what-if and reminders                                                                                                             |
| **Income**                            | Empty for a new user, with an Add item button. Category, name, amount (zero allowed), frequency, next payment date and predictability. Edit, delete, or swipe left to delete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Savings planning**                  | Existing savings with its date, a monthly target (a plan), a projection for the unfinished month (labelled projected), add and take out money (dated), the month-end results, goals, and an Investments screen. Overspending beyond the plan reduces savings (see ARCHITECTURE)                                                                                                                                                                                                                                                                                                                                                                                               |
| **Budgeting**                         | **Bills and fixed expenses** (due date, reminder, Mark as paid) and **Everyday budgets** (monthly amount per category). Empty for a new user. Every UAE category stays in the forms, including Other bill                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Actual spending**                   | Dated purchases per category against the monthly budget: budget, spent and remaining, negative shown as overspending, unbudgeted spending labelled. Month navigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Saving and history**                | Everything is saved on the device with a backup before any migration. Edits apply from the current month; deleting never removes past spending; each finished month is closed once; export a copy from Settings                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Investments** (opened from Savings) | Type, amount put in, worth now, profit or loss, income, allocation, planned monthly contribution. Tracking only, not advice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Accounts and Shared Savings**       | Register with a unique username and email (optional name and phone), confirm by emailed code, sign in, reset password, sign out, and **delete my account**. A person icon at the top right opens **My profile** (username, email, name, phone, send my username). On Add money, Take out and Edit saving choose **Keep private** or **Shared**: pick a group or **Someone new** (username or email; the app starts a group, invites them and they see it only after accepting). The **Shared** dashboard shows the combined total, each member's contribution, history and the same date filters. Privacy is enforced by the database. How it works: `docs/SHARED-SAVINGS.md` |
| **Due dates and reminders**           | Calendar date picker; bill reminders on the day, 1 day, 3 days, 1 week, 2 weeks before, or an exact date, shown in the app. **Phone reminders** (Settings, off by default): a notification at 9:00 on the reminder day naming the bill and due date, never an amount                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Look and feel**                     | Navy and gold theme in light and dark mode, a navy hero card for Safe to spend, icons, a welcome screen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Design rules baked in: money as integer fils; centralised strings and design tokens; written status and symbols,
never colour alone; 48px touch targets; accessible error messages; no shame-based wording; privacy-minimised
analytics (allow-listed events only, no financial values).

### Quality and security

- **680 tests in 56 suites:** domain maths (dates, reminders, savings, investments, chart data), edit and journey flows through every
  screen, the dashboards, accounts and sharing against a real embedded database with the real row level security,
  account deletion and rollback scripts, the local test server over HTTP, secure storage, notifications, analytics privacy,
  the audit gate and the exception watch.
- **Theme accessibility:** every text and background pair in both light and dark mode is tested at WCAG AA (4.5:1),
  and the chart colours were validated for both modes.
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

| Topic              | State                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo               | `github.com/ahmadal7aj-hub/cashflow-planner` (public), default branch `main`                                                                                                                                            |
| Branches           | `main` (protected), `staging` (protected, **unused and far behind**, no deploy pipeline yet)                                                                                                                            |
| Stack              | React Native + Expo SDK 57, TypeScript strict, Expo Router, npm. Supabase backend written (never run live) plus a local test server                                                                                     |
| Entry points       | `mobile/src/app/` (screens), `mobile/src/domain/` (pure maths), `mobile/src/state/` (plan, account and sharing state), `mobile/src/backend/` (Supabase and test-server connectors), `supabase/` (migrations, rollbacks) |
| Required PR checks | Quality, Security (dependencies), CodeQL                                                                                                                                                                                |
| Reviews required   | 0 (single maintainer; GitHub does not let you approve your own PR). Raise to 1 when a second person joins                                                                                                               |
| Release            | Nothing is deployed or published. No app-store identifiers chosen, deliberately                                                                                                                                         |
| Machine notes      | Windows. Use `npm.cmd` / `npx.cmd` if PowerShell blocks scripts. Free RAM is low (about 3 GB), so no Android emulator                                                                                                   |

See `docs/ARCHITECTURE.md` for the structure and `docs/TESTING.md` for how to run the checks.

### Known limitations (be honest about these)

- **Prototype.** Personal records are saved on the phone only and are not encrypted by the app (ADR 0005); uninstalling erases them. They are not synced between phones. Only the sign-in session is in the phone's secure storage.
- **The forecast maths is prototype maths** (`prototypeForecast.ts`, version `prototype-0.1`). The real, versioned,
  property-tested engine is Phase 3.
- **The gratuity estimate is not legally verified.** It is labelled illustrative and must get a UAE legal check.
- **No screenshots exist in the PRs, and the layout has only been looked at on one phone** (by the owner). Bar
  proportions and text wrapping on small screens are unverified.
- **Maestro E2E has never been run.**
- **Competitor data** is vendor marketing; Monarch prices and Wally's own site were not captured.
- The planning-horizon rule ("until the day before next payday", capped at 62 days) is an assumption, ADR 0003.
- **The theme, calendar, savings balance, investments, chart dashboards, profile and sharing screens have not been seen on a screen by Claude.** The logic and contrast are tested; spacing, chart proportions on small phones and text wrapping need the owner's eyes (the owner has seen and liked the chart dashboards).
- **Phone reminders are tested only with a stand-in for the phone.** Whether Expo Go delivers them on the owner's phone is unchecked. They are scheduled only while the app has been opened since the bill changed; a recurring bill's next reminder is scheduled the next time the app opens.
- **Sharing by phone number is not possible** (unverified numbers could be spoofed); people are found by username or email. The test server's code is always 123456 and it must never be exposed to the internet.
- **Inviting an email with no account does nothing and says nothing**, to avoid revealing who is registered. Sending a real invitation email needs the email setup.
- **The end-of-cycle savings result is an estimate** from a typical month (income minus typical spending), not from
  real transactions, which do not exist in the prototype.
- **Investment values are typed by the user** (no price feed) and nothing here is investment advice. Investment
  income counts in monthly income but not in the payday forecast.
- **Monthly bills repeat every 30 days in the projection** after the first (exact) occurrence, so a second
  occurrence inside the plan horizon can be a day or two off.
- **One intermittent test failure** was seen once on a cold start and could not be reproduced in four further runs;
  Jest's per-test timeout was raised to 20 seconds as a guard.

---

## 5. Decisions

| Decision                                                                                                        | Status                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Public repo with private business documents kept outside it                                                     | **Decided**                                                                                                                         |
| Stack (Expo, TypeScript, npm; Supabase later)                                                                   | **Decided** (ADR 0002)                                                                                                              |
| Planning horizon for the prototype                                                                              | **Decided for the prototype** (ADR 0003); revisit after interviews                                                                  |
| Eight PRD open decisions (name, horizon, safety buffer, accounts, import, pricing, minimum age, hosting region) | **Proposed, awaiting OWNER** (ADR 0004). Item 5 (import) was revised to "likely table stakes"                                       |
| **Cloud, on-device, or hybrid data storage**                                                                    | **Decided: hybrid** (ADR 0006). Personal records stay on the phone; only savings the user shares are sent. Revisit after interviews |
| Node-forge security exception                                                                                   | **Approved by OWNER 2026-10-02**, expires 2026-11-01                                                                                |
| Product name, pricing, minimum age, data-hosting region                                                         | **Open**, deliberately postponed (legal review, evidence)                                                                           |

---

## 6. Next actions

Work in this order. Do not skip ahead: Phase 2 is gated on step 4.

### A. This week (all OWNER)

| #   | Action                                                                                                                                                                                  | Done when                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | **Reset the test server and reload the app** (section 0, step 1)                                                                                                                        | The app opens with the Dashboards tab                                                  |
| 2   | **Test sharing with two accounts** (`docs/TEST-WITH-TWO-ACCOUNTS.md`) and click through everything new: profile, Shared choice, Dashboards sections, delete my account, phone reminders | You have a list of anything confusing, ugly or wrong, with screen names or screenshots |
| 3   | **Send that list to Claude**                                                                                                                                                            | Issues are fixed in small PRs                                                          |
| 4   | **Create the Supabase project** (`docs/BACKEND-SETUP.md`) and repeat the two-account check on it                                                                                        | Real email codes arrive and two phones see the same shared total                       |
| 5   | **Confirm or change the eight proposals in ADR 0004**                                                                                                                                   | Each item marked Accepted or changed                                                   |

### B. Weeks 1 to 3: validation (OWNER)

| #   | Action                                                                                                                                      | Done when                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 4   | **Recruit five people** who are salaried UAE residents with recurring bills (mix: expat and Emirati, single and family, iPhone and Android) | Five sessions booked             |
| 5   | **Run the sessions** using `docs/INTERVIEW-ONE-PAGER.md` and the walkthrough script; record private notes in `docs/private/` only           | Five anonymous note sheets       |
| 6   | **Summarise the first five against H1 to H7** (ask Claude to help) and decide whether to continue                                           | A written finding per hypothesis |
| 7   | **Continue to 20 to 30 interviews and at least 10 usability sessions**                                                                      | The BRD exit gate is met         |

### C. Dated items

| Date                 | What                                                                     | Action                                                                                                   |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Weekly (Mondays)     | Automatic exception watch                                                | Read the GitHub issue if one is opened                                                                   |
| **about 2026-10-26** | Exception is within 7 days of expiring                                   | **OWNER** decides: renew 30 days (Claude edits the file only on your explicit approval) or let it expire |
| **2026-11-01**       | **node-forge exception expires; CI fails again** unless fixed or renewed | If a fixed version exists, upgrade and delete the exception                                              |

### D. After the gate (only if interviews show demand): Phase 2 plan

Accounts, groups, sharing, the database with row level security and account deletion were built early, at the owner's request, so steps 1 and part of 4 below are partly done. The rest still waits for the gate.

1. **OWNER:** create Supabase dev, staging and production projects; decide the data-hosting region with UAE counsel.
2. **OWNER:** obtain a UAE legal read on PDPL, privacy wording, the gratuity estimate and whether any insight reads as advice.
3. Decide import (PDF/CSV) and the cloud/on-device question; record an ADR.
4. Build in the PRD ticket order: P0-02 environments, then P2-01 auth with tests, schema with RLS and cross-user denial
   tests, P2-02 financial profile, P2-03 commitments CRUD, P2-05 dashboard v1 using fixture-approved numbers.
5. Replace the prototype maths with the Phase 3 engine (P3-01 to P3-05), versioned and property-tested.
6. Then Phase 4 planning, Phase 5 beta hardening (notifications, export and delete, monitoring, backups), and only
   after pricing validation Phase 6 monetisation. Phase 7 bank connectivity needs its own legal go/no-go.

### E. Housekeeping and backlog (Claude can do these on request)

- Phone reminders are built (Settings); only a real-phone check is left (section 0).

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

| Risk                                       | Why it matters                                     | Mitigation                                                                                                      |
| ------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Manual entry loses to auto-import apps** | Several UAE competitors capture data automatically | Test import demand in every interview (H6); decide import before Phase 3                                        |
| **Cloud vs on-device trust**               | A competitor markets on-device-only data           | Decide deliberately; ask interviewees (H7)                                                                      |
| **Building before demand**                 | The BRD's top risk                                 | Hold Phase 2 until the gate                                                                                     |
| **Crowded UAE market**                     | At least five UAE-focused apps                     | Validate the differentiators in section 3 before building more                                                  |
| **Wrong or advice-like numbers**           | Loss of trust, possible regulatory scope           | Deterministic tested engine; legal review of wording and the gratuity estimate                                  |
| **Sensitive data in a public repo**        | Public repository                                  | Private docs git-ignored; secret scanning and push protection on; check `git diff --cached` before every commit |
| **Security exception lapses unnoticed**    | CI blocks all work                                 | Weekly watch, dated item in section 6C                                                                          |
| **Single maintainer**                      | No second review                                   | Automated gates; add a reviewer when possible                                                                   |

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

| Need                                              | Location                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Product and requirements (private)                | the BRD and PRD `.docx` files, outside the repo                                                                  |
| Rules for coding agents                           | `AGENTS.md` and `mobile/AGENTS.md`                                                                               |
| Architecture, testing, release, security, privacy | `docs/ARCHITECTURE.md`, `TESTING.md`, `RELEASE.md`, `SECURITY.md`, `PRIVACY-DATA-MAP.md`                         |
| Decisions                                         | `docs/adr/` (0001 to 0006)                                                                                       |
| Research and interviews                           | `docs/VALIDATION.md`, `INTERVIEW-KIT.md`, `INTERVIEW-ONE-PAGER.md`, `PROTOTYPE-WALKTHROUGH.md`, `FEATURE-GAP.md` |
| Private interview notes                           | `docs/private/` (git-ignored; never commit)                                                                      |
| Backend, sharing, rollback, local testing         | `docs/BACKEND-SETUP.md`, `SHARED-SAVINGS.md`, `ROLLBACK.md`, `TEST-WITH-TWO-ACCOUNTS.md`, `supabase/`            |
| Change history                                    | `CHANGELOG.md` and the closed pull requests                                                                      |
| Security exception                                | `mobile/audit-exceptions.json`, `mobile/scripts/`                                                                |

## 11. Glossary

- **Safe to spend:** cash plus expected income, minus bills due before payday, savings set aside, the safety buffer and
  expected everyday essentials. Never shown below zero; a shortfall is shown separately.
- **Everyday budget:** a monthly budget you spend against (groceries, Salik, dining). Essentials are set aside;
  non-essentials are funded from safe to spend.
- **Pay cycle:** payday to payday. Budgets and "spent so far" run on this cycle.
- **Fils:** 1/100 of a dirham. All money is stored as whole fils to avoid rounding errors.
- **Gate:** the BRD rule that Phase 2 waits for interview evidence of demand.
- **ADR:** architecture decision record, one short file per material decision.
