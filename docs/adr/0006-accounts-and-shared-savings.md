# ADR 0006: Accounts and shared savings on a backend

- Status: Accepted by the product owner on 2026-10-03 (this starts Phase 2 work ahead of the BRD interview gate; the
  owner decided to proceed)
- Date: 2026-10-03

## Context

The owner asked for registered users (unique username and email, email verification, password reset), groups of two or
more people who connect by invitation, and a **Shared Savings** dashboard, visible in every accepted member's account,
that combines only the savings each person explicitly shares. Privacy had to be enforced by the database, and it had to
work between separate accounts and devices. The BRD held Phase 2 (accounts, database) until 20 to 30 interviews showed
demand; the owner chose to build it now.

## Decision

1. **Backend: Supabase** (PostgreSQL, Auth, Realtime), as in ADR 0002.
2. **Hybrid data.** Personal records (income, budgets, spending, savings, goals) stay **on the phone**, as in ADR 0005,
   now one saved plan **per account**. Only savings a user **explicitly shares** are copied to the database, as one
   record each. Sharing never copies, moves or adds an amount to anyone's personal total.
3. **A pair is a group of two.** Groups have up to 20 people. Invitations go to registered accounts by username or
   email and must be accepted. The creator is an admin; the longest-standing member takes over if the last admin leaves.
4. **Privacy lives in the database.** Every table has Row Level Security and clients have **read-only** grants. Every
   write goes through a `security definer` function that checks `auth.uid()` itself. Pending invitees and unrelated
   accounts can read nothing (a pending invitee sees only the group name and who invited them). Only an entry's owner can
   change, make private or delete it. Tests run the real SQL as different users.
5. **One source of truth for totals.** `group_savings_summary` computes period and total savings in SQL, so every
   member sees the same numbers.
6. **Email codes, not links.** Verification and reset use a code typed into the app (no deep links, which are fragile in
   Expo Go).
7. **Accounts are optional at build time.** Without the Supabase settings the app runs on its own, unchanged.

## Historical reporting rules (decided with the owner)

- A shared saving counts at **its own date**. Sharing an older saving therefore changes totals for earlier periods; the
  entry keeps a "shared on" date so the history stays explainable.
- **Making a saving private** removes it from every member's totals for all dates. The group history keeps a note
  ("made a shared saving private") with **no amounts**.
- **Leaving a group** (or being removed) makes all of that person's shared savings private again, removing them from the
  group totals for all dates after a confirmation that explains this. The person's own records are untouched. The history
  keeps "left the group".
- **Shared totals contain only shared entries.** Nobody's opening balance is included. For dates before the group's first
  shared entry there is **no balance** and the screen says so instead of showing zero.
- Only manual deposits and withdrawals can be shared (not the automatic month-end results, which come from private
  income and spending). An entry is shared with **one group at a time**.
- Dates are plain calendar dates of the person who saved; ranges use the viewer's own calendar.

## Consequences

- **Not verified against a live Supabase project by the assistant.** The SQL, the policies and the app were tested
  against a real PostgreSQL (PGlite) with Supabase's `auth.uid()` simulated. Supabase Auth itself (emails, rate limits,
  Realtime) can only be tested once the owner creates the project (`docs/BACKEND-SETUP.md`).
- **Two phones, one account:** personal records are not synced between them. Shared entries are keyed by phone id, so a
  second phone never removes entries shared from the first.
- **Privacy to revisit before real users:** the session token and the saved plan are in unencrypted app storage; email
  addresses and shared amounts are personal data held in the cloud (UAE PDPL review, privacy notice, region choice, an
  account-deletion path, and abuse limits are still to do).
- **Username lookup** (`username_available`) is callable without an account so registration can say "taken"; it reveals
  whether a username exists, nothing more.
- **Reversal:** `docs/ROLLBACK.md` and `supabase/rollback/20261003000000_down.sql`.
