# UAE Cash-Flow Planner (working name)

A mobile-first personal cash-flow planning app for UAE residents. Its core job is to forecast the user's near-term position and answer: *How much can I safely spend? Where will I finish the month? What problem is coming next?* It is not primarily an expense tracker.

**Status:** Validation / pre-build. Phase 0 (foundation) in progress.

## Source of truth

- Business requirements: `docs/source/UAE_Cashflow_Planner_BRD_v1.0.docx`
- Product requirements: `docs/source/UAE_Cashflow_Planner_PRD_v1.0.docx`
- Coding-agent rules: [`AGENTS.md`](AGENTS.md)

## Prerequisites

- Git
- Node.js LTS (not yet installed on the founder machine) and a package manager
- Expo / EAS tooling (added in the app shell step)

## Setup

Setup commands will be documented here once the Expo app shell lands (P0-01 follow-up).

## Environments

`dev`, `staging` and `production` are isolated, each with its own Supabase project and secrets (P0-02). Production credentials are never available locally by default.

## Repository layout

```
AGENTS.md            rules for coding agents
docs/                project documentation (see docs/README.md)
docs/adr/            architecture decision records
docs/source/         original BRD / PRD (.docx)
```
