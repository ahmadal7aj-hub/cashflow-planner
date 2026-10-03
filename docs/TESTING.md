# Testing

**Current state:** 500 tests in 36 suites, all passing. Jest's per-test timeout is 20 seconds to avoid false failures on a cold start. Run them with one command (below).

## Layers

| Layer | What it covers | Where |
|---|---|---|
| **Unit (domain)** | Money, dates and months, effective-dated amounts, occurrences, budget versus actual, the savings engine (month close, corrections, projection), dashboard ranges, saving and loading, forecast, reminders, investments, sharing preview | `mobile/src/domain/*.test.ts` |
| **Edge cases** | Zero income, shortfall (negative raw safe-to-spend), payday today, commitments larger than balance, one-off items, caps and limits, rounding boundaries | same |
| **Component** | Charts, accessible labels, table view, shortfall state | `mobile/src/components/charts.test.tsx` |
| **Journey / integration** | Whole flows through the real navigator: empty states and Add item forms for a new user, the groceries and petrol examples, both deletion methods with Cancel, saving and loading, savings reductions, every date preset and custom range, Period versus Total savings, export | `mobile/src/__tests__/*.test.tsx` |
| **Provider** | Saving, loading, restart, month rollover and storage safety without any screens | `mobile/src/__tests__/persistence.test.tsx`, helper `src/testing/provider.tsx` |
| **Tooling** | The dependency audit gate and the weekly exception watch | `mobile/scripts/*.test.js` |
| **Database / RLS** | Not yet (no database). Added in Phase 2 with cross-user denial tests for every user-owned table | later |
| **E2E on a device** | Maestro smoke flow written, **never run** | `mobile/.maestro/smoke.yaml` |

Every hand-calculated number in the tests is explained in a comment (for example safe to spend
12,000 - 7,080 - 1,200 - 300 - 1,650 = 1,770). If a sample number changes, update the tests, the walkthrough
script and the Maestro flow together.

## Commands

Run in `mobile/` (on Windows PowerShell use `npm.cmd` if scripts are blocked):

| Command | Purpose |
|---|---|
| `npm run check` | format check + lint + typecheck + tests with coverage (what CI runs) |
| `npm test` | Jest only |
| `npm run test:ci` | Jest with coverage |
| `node scripts/audit-gate.js` | The dependency audit gate (high / critical block; approved exceptions are printed) |
| `node scripts/exception-watch.js` | Prints a message only if an exception needs attention |

CI (`.github/workflows/ci.yml`) additionally runs `expo-doctor`, a JS bundle export and dependency review.
CodeQL runs in `codeql.yml`. Note: `expo-doctor` makes network calls and has failed once from a transient
blip; re-running it passed.

## Writing tests here

- Put maths in `domain/` and test it as pure functions with hand-calculated expectations.
- For screens use `openApp(url, { seed, today })` from `src/testing/app.tsx`. It fixes today's date (15 Oct 2026 by
  default), starts from a plan you pass (an empty new user by default) and shares one route map. Call
  `installTestLifecycle()` at the top of each test file. Builders: `userWith`, `dashboardWorld`, `salary`, `everyday`,
  `bill`; `swipeLeft(testID)` drives the real swipe handlers; `pickDate` chooses a calendar day.
- The device storage is replaced by a small in-memory stand-in (`jest.setup.js`) that works under fake timers.
- **Known quirk:** the router test library can carry the previous test's route into the next test after a long
  navigation path. Keep long journeys in their own file (that is why the saving tests are split across files).
- Give every route in the test route map, or the layouts log "No route named" warnings.
- Prefer accessibility labels (`getByLabelText`) over test ids for numbers; they double as an accessibility check.
- Every bug fix gets a regression test that fails without the fix.
- **Never use real customer financial data in fixtures.**

## E2E smoke test (Maestro, P0-05)

Flow: `mobile/.maestro/smoke.yaml` walks welcome -> the savings questions -> the empty Income page -> Settings, Load
sample data -> the Dashboard (checks AED 1,770.00), opens the explanation, and runs the what-if. It **replaces the saved
data on the device**, so run it only on a test phone or on a fresh install.

It is a **documented pre-merge mobile E2E job** because it needs a phone or emulator:

1. Install Maestro (needs JDK 17; see https://maestro.mobile.dev) and connect an Android phone with USB debugging
   (an emulator is too heavy for the current machine).
2. `cd mobile && npm start` and open the project in Expo Go.
3. `maestro test .maestro/smoke.yaml`

**Status: written but never executed.** Run it once before relying on it, and move it into CI when an emulator job
is added. It targets Expo Go (`host.exp.exponent`) until a bundle id is chosen.
