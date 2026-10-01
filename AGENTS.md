# AGENTS.md

You are implementing a consumer financial planning application.

## Non-negotiable rules

1. Read BRD, PRD, ARCHITECTURE.md, SECURITY.md and relevant ADRs before coding.
2. Implement only the requested requirement IDs. Do not invent scope.
3. Never push directly to `main` or `staging`. Work in a short-lived feature branch and open a PR.
4. Never disable tests, branch protections, RLS, security scans or type checks to make a build pass.
5. Never commit secrets, tokens, real user data, bank credentials or production dumps.
6. Every new feature requires tests. Every bug fix should include a regression test where feasible.
7. Financial calculations must be deterministic pure functions with explicit tests. Do not use an LLM for arithmetic or as the source of truth.
8. Every user-owned database table must use Row Level Security and must have cross-user denial tests.
9. Do not log salary, balances, transactions, notes, access tokens or other sensitive financial/personal data.
10. Production is read-only to the coding agent unless a human explicitly approves a release workflow.
11. Keep PRs small. Include: requirement IDs, what changed, security/data impact, tests run, screenshots for UI, migrations, rollback notes.
12. If a requirement conflicts with security/privacy or is ambiguous in a way that could affect money/data, stop and ask for human clarification.

## Default engineering preferences

- TypeScript strict mode.
- React Native + Expo for mobile.
- Supabase/PostgreSQL with migrations and RLS.
- Zod at data boundaries.
- Pure domain functions for forecast logic.
- GitHub Actions required checks.
- Maestro for critical E2E journeys.

## Phase discipline

Implement one small phase at a time (see `docs/source/` BRD section 8 and PRD section 4). Do not add unrequested features, change architecture, weaken security controls, or touch production directly. Every feature must include tests and documentation updates.
