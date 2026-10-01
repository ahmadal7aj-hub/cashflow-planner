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

CI (`.github/workflows/ci.yml`) additionally runs `expo-doctor`, a JS bundle export, a production-dependency audit (high/critical blocks) and dependency review. CodeQL runs in `codeql.yml`. Database/RLS tests and Maestro E2E are added in later phases.

## Fixtures
Never use real customer financial data in fixtures.
