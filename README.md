# UAE Cash-Flow Planner (working name)

A mobile-first personal cash-flow planning app for UAE residents. Its core job is to forecast the user's near-term position and answer: *How much can I safely spend? Where will I finish the month? What problem is coming next?* It is not primarily an expense tracker.

**Status:** Validation / pre-build. Phase 0 (foundation) in progress.

## Source of truth

- Business requirements: `docs/source/UAE_Cashflow_Planner_BRD_v1.0.docx`
- Product requirements: `docs/source/UAE_Cashflow_Planner_PRD_v1.0.docx`
- Coding-agent rules: [`AGENTS.md`](AGENTS.md)

## Prerequisites

- Git
- Node.js LTS (24.x) and npm
- JDK 17 (only for Maestro E2E tests, P0-05)
- Expo Go on a phone to run the app (no emulator needed for the prototype)

## Setup

```bash
cd mobile
npm ci            # install locked dependencies
npm start         # start Expo; scan the QR code with Expo Go
```

## Common commands (run in `mobile/`)

| Command | Purpose |
|---|---|
| `npm run check` | format check + lint + typecheck + tests (what CI runs) |
| `npm run format` | auto-format with Prettier |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Jest unit/component tests |

## Environments

`dev`, `staging` and `production` are isolated, each with its own Supabase project and secrets (P0-02). Production credentials are never available locally by default.

## Repository layout

```
AGENTS.md            rules for coding agents
mobile/              Expo + TypeScript app
docs/                project documentation (see docs/README.md)
docs/adr/            architecture decision records
docs/source/         original BRD / PRD (.docx)
```
