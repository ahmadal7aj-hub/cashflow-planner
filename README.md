# UAE Cash-Flow Planner (working name)

A mobile-first personal cash-flow planning app for UAE residents. Its core job is to forecast the user's near-term
position and answer: *How much can I safely spend? Where will I finish the month? What problem is coming next?* It is
not primarily an expense tracker.

**Status (2026-10-02):** Validation / pre-build. A **clickable prototype** (sample data, in memory, nothing saved or
sent) is built and tested. Backend, accounts and the real forecast engine wait for interview evidence of demand.
**Start with [`docs/HANDOVER.md`](docs/HANDOVER.md):** what is done, what is next, and who owns each step.

## What the prototype shows

Five tabs: **Overview** (safe to spend until payday, balance chart, what-if), **Spending**, **Savings** (with a
current savings balance and an Investments screen), **Income** and **Insights**. Income, bills, everyday budgets,
goals and investments are editable, with real due dates and bill reminders and standard UAE categories (rent, DEWA,
du / e&, Salik, parking, school fees, money sent home, or an Other bill you name). Navy and gold theme in light and
dark mode. Every headline number can be explained.

## Source of truth

- Business and product requirements: the BRD and PRD `.docx` files. They are **private and not in this repository**.
- Coding-agent rules: [`AGENTS.md`](AGENTS.md)
- Decisions: [`docs/adr/`](docs/adr/)

> This repository is **public**. Never commit secrets, real financial data, interview notes or the BRD/PRD.

## Prerequisites

- Git
- Node.js LTS (24.x) and npm
- JDK 17 (only for Maestro E2E tests)
- **Expo Go** on a phone to run the app (no emulator needed)

## Setup

```bash
cd mobile
npm ci            # install locked dependencies
npm start         # start Expo; scan the QR code with Expo Go
```

**Windows PowerShell:** if scripts are blocked, use `npm.cmd` and `npx.cmd`.
**Expo Go sign-in:** this Expo SDK needs Expo Go and the Expo CLI signed in to the **same** Expo account
(`npx expo login`). If your account was created with Google, Apple or GitHub, set a password on expo.dev first.

## Common commands (run in `mobile/`)

| Command | Purpose |
|---|---|
| `npm run check` | format check + lint + typecheck + tests (what CI runs) |
| `npm run format` | auto-format with Prettier |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Jest tests (475 at the time of writing) |
| `node scripts/audit-gate.js` | dependency audit gate (high / critical block) |

## Environments

`dev`, `staging` and `production` are planned, each with its own Supabase project and secrets (P0-02). **None are
created yet.** Production credentials must never be available locally by default. The app already shows a banner on
non-production builds.

## Repository layout

```
AGENTS.md            rules for coding agents
mobile/              Expo + TypeScript app
  src/app/           screens (Expo Router)
  src/domain/        pure money and forecast logic (all formulas live here)
  src/state/         in-memory plan
  scripts/           CI tooling (audit gate, exception watch)
  .maestro/          E2E smoke flow (written, not yet run)
docs/                project documentation (see docs/README.md)
docs/adr/            architecture decision records
.github/             CI, CodeQL, Dependabot, the weekly exception watch
```

Private, git-ignored: `docs/source/` (BRD/PRD), `docs/private/` (interview notes), `*.docx`, `*.pdf`.

## Contributing

Short-lived branch, small PR with requirement IDs, wait for the three required checks (Quality, Security, CodeQL),
then squash merge. `main` is protected and nothing is pushed to it directly. See `AGENTS.md`.
