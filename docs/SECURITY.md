# Security

> Draft skeleton (P0-01). Baseline: OWASP MASVS (mobile) and OWASP API security principles.

## Threat model
_TBD before Phase 2._

## Data classification
Financial data is treated as highly sensitive even where not legally classified as sensitive personal data. Transaction notes are sensitive.

## Authentication and authorization
- Managed auth, email verification, secure session handling, rate limiting.
- RLS enabled on every exposed table, deny-by-default; cross-user denial tests for every user-owned table.
- Service-role key server-side only.

## Secrets
Never commit secrets. `.env*` is git-ignored; `.env.example` lists names only. Keys scoped per environment; rotate exposed secrets immediately.

## Logging
No salary, balances, transactions, notes, tokens or credentials in logs, crash reports or analytics.

## Dependency vulnerabilities and risk acceptance

CI (`mobile/scripts/audit-gate.js`) fails on any **high or critical** advisory in production dependencies.

A finding can be temporarily risk-accepted only by adding an entry to `mobile/audit-exceptions.json` that names:

- the exact advisory id (an exception never covers any other advisory),
- the reason, including whether the vulnerable code ships in the app,
- an **expiry date** (default 30 days), after which the exception stops applying and CI fails again,
- who accepted it (the product owner).

CI prints every active exception, so accepted risks are never hidden. Remove the entry as soon as a fixed
version exists. Moderate and low advisories do not block, but are reviewed at each Expo SDK upgrade (ADR 0002).

**Active exceptions:** see `mobile/audit-exceptions.json`.

## Incident contacts
_TBD._
