# Architecture

Describes what exists today (the Phase 1 prototype) and the target for later phases. Record every material
decision as an ADR in `adr/`.

## 1. Today: the prototype

A single Expo React Native app. **No backend, no network calls, no persistence.** All data is fictional sample data
held in memory and reset when the app closes.

```
mobile/src/
  app/            screens and navigation (Expo Router, file based)
    (tabs)/       Overview, Spending, Savings, Income, Insights (bottom tab bar)
    commitments   "Your income and expenses" list
    edit/[kind]/[id]   add / edit / delete form (income, bills, budgets, goals, investments, savings, employment)
    investments   the Investments screen (opened from the Savings tab)
    onboarding, explain/[metric], warning/[id], scenario, settings (incl. Appearance), index (welcome)
  components/     ui kit (ui.tsx), forms, dates (calendar picker), ReminderPicker, charts, dashboard parts
  domain/         PURE functions only: money, dates, plan model, forecast, reminders, savings balance, investment /
                  spending / savings / income / insight analytics, UAE categories, sample data
  state/          PrototypeContext: the in-memory plan, today's date, and the CRUD actions
  i18n/strings.ts all user-facing text
  theme/          palettes.ts (light + dark), ThemeProvider (follows the phone or a manual choice), tokens.ts (layout)
  analytics/      allow-listed, privacy-safe event recorder (memory only)
  config/         environment resolution (development / staging / production)
mobile/scripts/   audit-gate.js and exception-watch.js (CI tooling, with tests)
```

### Layering rules (enforced by review and tests)

1. **`domain/` is pure.** No React, no I/O, no clocks, no random. Same input gives the same output. It is where every
   formula lives. The one exception is `todayISO()` in `dates.ts`, called once at the edge of the app; everything else
   takes today's date as an argument.
2. **Screens never do money maths.** They call a `domain/` function and render the result. No duplicated formulas.
3. **Money is integer fils.** Floats are never used for money. Formatting is display-only (`formatAed`).
4. **All text comes from `i18n/strings.ts`**; colours come from the theme (`useTheme` / `makeStyles`, never a
   hard-coded hex in a screen) and spacing from `theme/tokens.ts`. Every text and background pair is contrast-tested
   in both light and dark mode.
5. **Status is never colour alone.** A symbol and written label always accompany colour.
6. **Analytics are allow-listed.** Unknown event properties are dropped, so a financial value cannot be recorded.

### Data flow

```
sample data (domain/sampleData)
        |
        v
PrototypeContext (raw plan: balance, buffer, income[], expenses[], goals[], investments[], savings, employment)
        |  resolvePlan(plan, today)            -> real dates become relative days
        |  deriveForecastInput(plan)           -> ForecastInput
        |  computeForecast(input)              -> ForecastResult (baseline)
        |  + what-if purchase                  -> ForecastResult (scenario, never mutates the plan)
        v
screens read: baseline / scenario / plan, and call pure analytics:
  spendingInsights, savingsInsights, savingsBalance, investmentInsights, incomeInsights, insights, reminders,
  forecastCharts
```

### Planning model (prototype, ADR 0003)

- **Horizon:** today until the day before the next payday, taken from the salary item. Capped at 62 days. When payday
  is today, the horizon is the next pay cycle and today's salary is counted as arriving now.
- **Safe to spend** = cash + expected income - bills due before payday - savings set aside - safety buffer - expected
  everyday essentials. Clamped at zero; a shortfall is reported separately.
- **Essentials vs discretionary:** the remaining budget of essential everyday categories (groceries, fuel, Salik,
  parking...) is deducted. Dining, shopping and similar are funded *from* safe to spend, not deducted.
- **Dates:** bills, income and goal deadlines can have real dates. They are resolved to relative days for `today` in
  one pure function, so all the maths is unchanged. Recurring dates roll forward by calendar month, keeping the day
  of month.
- **Money set aside:** savings goal contributions plus planned investment contributions are reserved each cycle.
  Investment income counts in monthly income but not in the payday forecast.
- **Savings balance:** a separate pot that goals earmark parts of. It changes by deposits, withdrawals (never more
  than saved) and an end-of-cycle result (typical income minus typical spending), applied once per cycle on request.
- **Reminders:** stored as days before a bill's due date, so they repeat with the bill; in-app only.
- **Version:** every result carries `calculationVersion` (`prototype-0.1`).

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
