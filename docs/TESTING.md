# Testing

> Draft skeleton (P0-01).

## Layers
Unit, property/edge-case, component, database/RLS, integration, E2E (Maestro), security, regression.

## Required edge cases for the forecast engine
Zero income, negative raw safe-to-spend, leap year, month boundary, payday today, commitment > balance, duplicate schedule occurrences.

## Critical E2E journeys
First-time setup -> dashboard; edit commitment -> forecast changes; scenario comparison; export/delete.

## Commands
Run in `mobile/`:

- `npm run check`: format check + lint + typecheck + tests with coverage (same as CI).
- `npm test`: Jest in watch-less single run; `npm run test:ci` adds coverage.

CI (`.github/workflows/ci.yml`) additionally runs `expo-doctor`, a JS bundle export, a production-dependency audit (high/critical blocks) and dependency review. CodeQL runs in `codeql.yml`. Database/RLS tests are added in Phase 2.

## E2E smoke test (Maestro, P0-05)

Flow: `mobile/.maestro/smoke.yaml` walks welcome -> onboarding -> commitments -> dashboard (checks the hand-verified AED 1,750.00), opens the explanation, and runs the what-if.

Run it as a **documented pre-merge mobile E2E job** (it needs an emulator or phone, so it is not in the cloud CI yet):

1. Install Maestro (needs JDK 17; see https://maestro.mobile.dev) and an Android emulator or a connected device.
2. `cd mobile && npm start` and open the project in Expo Go.
3. `maestro test .maestro/smoke.yaml`

Status: the flow is written but **has not been executed yet**, because no emulator or device is set up on the development machine. Run it once before relying on it, and move it into CI when an emulator job is added. It targets Expo Go (`host.exp.exponent`) until a bundle id is chosen.

## Fixtures
Never use real customer financial data in fixtures.
