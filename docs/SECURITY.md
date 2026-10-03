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

### What is implemented (accounts and shared savings, ADR 0006)

- **Sign-in:** Supabase Auth with email and password (minimum 10 characters), email verification by one-time code, password
  reset by code, sign-out. Login never reveals whether an email exists; the password-reset screen never says either.
- **Row Level Security on every table**, deny-by-default. Signed-in users have **read-only** grants; anonymous users have none.
  Every write goes through a function that checks `auth.uid()` and the caller's role in the group.
- **Cross-user denial tests** (`mobile/src/backend/*.db.test.ts`) run the real SQL as different users against a real
  PostgreSQL: pending invitees and unrelated accounts read nothing, only the owner can change an entry, only an admin can
  invite or remove, and no one can write to a table directly. A guard test fails if a new table is added without Row Level Security.
- **No financial data in logs or analytics.** The group history stores events, never amounts.
- **The service-role key never exists in the app**; the two public settings are read from environment variables.

### Known gaps (before real users)

- Session tokens and the saved plan are in **unencrypted app storage** on the phone.
- `username_available` is callable without an account (so registration can say "taken"); it reveals whether a username exists.
- No account-deletion function yet; no rate limiting beyond Supabase defaults; no second factor.
- The built-in Supabase email sender is for testing only; use your own SMTP provider.
- Not yet tested against a live Supabase project; no penetration test; UAE PDPL review pending.

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

**Reminder:** a weekly workflow (`.github/workflows/exception-watch.yml`) opens a GitHub issue assigned to the owner when a fixed version is published, or an exception is within 7 days of expiring or has expired. It comments on the open issue each week until resolved. Scheduled workflows can be paused by GitHub after 60 days without repository activity, so re-enable them if that happens.

**Active exceptions:** see `mobile/audit-exceptions.json`.

## Incident contacts
_TBD._
