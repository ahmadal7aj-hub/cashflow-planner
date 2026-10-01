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

## Incident contacts
_TBD._
