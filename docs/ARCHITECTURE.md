# Architecture

Describes what exists today (the Phase 1 prototype) and the target for later phases. Record every material
decision as an ADR in `adr/`. To go back to the layout before the five-page restructure, see `ROLLBACK.md`.

## 1. Today: the prototype

A single Expo React Native app. **No backend and no network calls.** What the user enters is **saved on the phone**
(versioned JSON in the app storage, with backups; see ADR 0005). A new user starts with nothing: no sample amounts.
Sample data exists only for demos (Settings, Load sample data).

```
mobile/src/
  app/            screens and navigation (Expo Router, file based)
    (tabs)/       Dashboard, Income, Savings planning, Budgeting, Actual spending (+ Shared when linked)
    setup         first-run savings questions (existing savings, its date, monthly target; zero allowed)
    edit/[kind]/[id]   add / edit / delete form: income, fixed (bills), variable (everyday budgets), expense (an actual
                  spending record), goal, investment, employment, savings-in / out / target / opening
    investments, scenario (what-if), settings, link (Shared preview), onboarding (spendable balance and buffer),
    explain/[metric], warning/[id], index (welcome)
  components/     ui kit, forms, dates (calendar picker), SwipeableCard, EmptyState, DeleteButton, charts, ...
  domain/         PURE functions only
    money, dates, months, versioned, occurrences      value types and calendar maths
    budgetModel     the plan types, deriveForecastInput, resolvePlan
    spending        budget versus actual per category, for any date range
    savingsEngine   balance, period savings, month results, projection, once-per-month close, corrections
    planOps         every edit as a pure function (history is kept)
    dashboardRange  date presets, custom ranges, the dashboard summary
    persistence     saving, loading, backup, versioning
    prototypeForecast, reminders, investmentInsights, sharedDashboard, savingsInsights, spendingInsights
    uaeCategories, sampleData
  state/          PrototypeContext: loads and saves the plan, exposes actions; testSeed (tests only)
  i18n/strings.ts all user-facing text
  theme/          palettes (light and dark), ThemeProvider, tokens
  analytics/      allow-listed, privacy-safe event recorder (memory only)
  testing/        test helpers (not shipped): app routes and builders, provider harness
```

### Layering rules (enforced by review and tests)

1. **`domain/` is pure.** No React, no I/O, no clocks, no random. The only impure function is `todayISO()` in
   `dates.ts`, called once at the edge; everything else takes today's date as an argument. Dates are plain ISO strings
   in the user's own calendar, so there is no time-zone drift.
2. **Screens never do money maths.** They call a `domain/` function and render the result.
3. **Money is integer fils.** Formatting is display-only.
4. **All text comes from `i18n/strings.ts`**; colours from the theme; every pair is contrast-tested in both modes.
5. **Status is never colour alone.** A written label always accompanies colour.
6. **Analytics are allow-listed.** A financial value cannot be recorded.

### The data model

One `Plan` document:

- `income`, `expenses` (kind `fixed` = bills with due dates, kind `variable` = monthly everyday budgets), `goals`,
  `investments`, optional spendable balance and safety buffer (used only by the safe-to-spend card).
- `transactions`: **dated actual spending**, always more than zero. A planned bill or budget is **not** a transaction.
  Marking a bill as paid creates one transaction linked to that bill occurrence, so it is counted once.
- `savings`: a **ledger**: the opening balance with its date, effective-dated monthly targets, dated movements
  (deposit, withdrawal, month-close, correction) and the frozen result of each closed month.
- `retiredIncome`, `retiredExpenses`: deleted items, kept so earlier months still report correctly.

### History is never rewritten

- Amounts are **effective-dated**: editing a budget, bill or income applies from the current month; earlier months keep
  the old amount.
- **Deleting** an item moves it to the retired list and ends it from the current month. Past spending is never deleted.
- A finished month is **closed once** (key `YYYY-MM`) and frozen. Closing is idempotent, so reopening the app any number
  of times never adds it again. A back-dated change to a closed month adds a dated **correction** in the present.

### Budget versus actual

- Every category shows **monthly budget, actual spending this month and remaining = budget - actual**; a negative
  remainder is shown as overspending. Spending in a category with no budget is allowed and labelled **Unbudgeted**.
- **Whole months** use the exact budget. **Part of a month** (last week, a ten-day custom range): everyday budgets are
  shared out by days (budget x days in range / days in that month); a **bill counts when it falls due** inside the
  range. Non-monthly bills (school fees, insurance) count in the month they fall due.

### Savings (four things kept apart)

| Idea                  | Meaning                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Existing balance**  | The opening balance plus every movement dated on or after the opening date. Not income, not saved in any period.                                              |
| **Monthly target**    | A plan, never counted as money already saved.                                                                                                                 |
| **Projected savings** | An estimate for an unfinished month, always labelled projected: all scheduled income, and spending of whichever is larger, the plan or what is already spent. |
| **Actual movements**  | Deposits, withdrawals, month results and corrections. Transfers are never income or spending.                                                                 |

At month end, with `result = income received - actual spending`: **added = max(0, min(result, target))** and
**taken from existing savings = max(0, -result)**. So overspending first reduces that month's planned saving, and only
the part beyond it reduces existing savings. Only the **overall** totals matter, so underspending in one category offsets
overspending in another. If income equals the spending plan plus the target: opening 5,000 and target 1,000 with 300
overspent closes at 5,700; with 1,200 overspent, nothing is added, 200 comes from existing savings and it closes at 4,800.
Surplus above the target is not saved automatically.

### The dashboard

Defaults to the current calendar month. Presets (device time zone, both ends included): **current month**, **last week**
(previous full Monday to Sunday), **last month**, **last quarter** (previous calendar quarter), **last year**, and a
**custom range** typed as `YYYY-MM-DD` (any valid start and end). Filtering changes only the view. A toggle switches
**period savings** (net movements dated inside the range, including reductions, excluding the opening balance) and
**total savings** (the cumulative balance at the end of the range; if the range ends before the balance began it says so
instead of inventing a number).

### Planning model for the safe-to-spend card (ADR 0003)

- **Horizon:** today until the day before the next payday, from the salary item. Capped at 62 days.
- **Safe to spend** = cash + expected income - bills due before payday - savings set aside - safety buffer - expected
  everyday essentials. The card appears only when a spendable balance has been entered.
- **Money set aside:** the larger of the monthly savings target and the goal contributions, plus investment contributions.
- **Version:** every result carries `calculationVersion` (`prototype-0.1`).

### Accounts and shared savings (ADR 0006)

```
phone (Expo app)                                   Supabase
  personal plan  (never leaves the phone)           Auth: email, password, one-time codes
  one saved plan per account                        PostgreSQL + Row Level Security on every table
  savings you choose to share  --- share_entry --->   shared_entries (one row per shared saving)
  Shared Savings dashboard    <--- group_savings_summary, list_group_entries, Realtime events
```

- `src/backend/` is the only code that talks to the server: `supabaseBackend.ts` (Auth + the database functions),
  `sharingApi.ts` (typed calls), `contract.ts` (the list of database functions), `config.ts` (the two public settings).
- `src/state/AccountContext` holds the session; the sign-in screens (`src/auth/`) replace the app while nobody is signed
  in. `SharingContext` loads groups and invitations, listens for changes, and **keeps the shared copies in step with the
  phone** (`domain/shareSync.ts`: one record per saving keyed by phone id + saving id, so a retry never adds an amount twice
  and another phone's entries are never removed).
- `PrototypeProvider` is keyed by account, so each account has its own saved plan on a phone and nobody sees another
  person's records. Without the Supabase settings the app runs unchanged, with accounts off.
- **The database is the authority.** Clients can only SELECT; every write is a `security definer` function that checks
  `auth.uid()`. A pending invitee sees only the group name and who invited them. Totals come from
  `group_savings_summary`, so every member sees the same numbers. See `supabase/migrations/` and `SHARED-SAVINGS.md`.

## 2. Target (later phases, not built)

- **Mobile:** same Expo app. **Backend:** Supabase (PostgreSQL with Row Level Security, Auth, Edge Functions).
- **Open decision before Phase 2:** cloud, on-device, or hybrid storage (see `HANDOVER.md` section 5).
- **Engine:** replace `prototypeForecast.ts` with the Phase 3 engine: pure, versioned, property-tested, with
  `calculation_version` stored alongside saved forecasts.
- **Data boundaries:** Zod schemas at every boundary; the Supabase service-role key is server-side only and never
  ships in the client.
- **Trust boundaries (planned):** device to Supabase over TLS with a user JWT, authorised by RLS; privileged
  operations (export, delete) in authenticated server functions with audit events.
- **Bank connectivity** is Phase 7 and needs its own legal, regulatory and commercial go/no-go. The app never handles
  banking credentials.

## 3. Operations (today)

- **CI** (`.github/workflows/ci.yml`): install, format, lint, typecheck, tests with coverage, `expo-doctor`, JS bundle
  export, dependency audit gate, dependency review. **CodeQL** runs separately. **Exception watch** runs weekly.
- **Branches:** `main` protected (PR, three required checks, admins included, linear history). `staging` exists but
  has no deploy pipeline.
- **Environments:** one app build; `EXPO_PUBLIC_APP_ENV` selects a label and shows a banner on non-production builds.
  Separate Supabase projects per environment are not yet created.
