# Rollback: going back to the layout before the five-page restructure

The restructure (Dashboard, Income, Savings planning, Budgeting, Actual spending, with data saved on the phone) is
reversible. This page records the checkpoint, how to restore it, and the one unavoidable data compatibility issue.

## The checkpoint

| What | Value |
|---|---|
| **Tag** | `checkpoint/pre-restructure-2026-10-03` (annotated, pushed to GitHub) |
| **Commit** | `e62af1c` |
| **Backup branch** | `backup/pre-restructure-2026-10-03` (same commit, pushed) |
| **State captured** | The working tree was clean, so nothing uncommitted existed. It contains the monthly plan, zero amounts, delete confirmation and the Shared dashboard preview (PR #44 and #45 content). It does **not** contain the adjustable what-if (PR #42), the sharing spec (PR #43) or the handover update (PR #41). |
| **Verified** | The tag was checked out into a separate worktree and its full test suite ran: 31 suites, 506 tests, all passing. The worktree was then removed. |

## "Reverse these changes": the procedure

Nothing here is destructive. **Do not** use `git reset --hard`, force-push, or clear the app's data as a first step.

1. **Keep the records.** On the phone: Settings, then **Export my data**, and send the copy to yourself (Files, Notes
   or email). The data also stays in the app's own storage under the key `cashflow.plan`, with backups under
   `cashflow.backup.*`; the old layout never touches those keys, so they are not deleted by going back.
2. **Make a branch from the current `main`:** `git switch -c reverse/restructure main`.
3. **Undo with new commits**, which keeps history: `git revert -m 1 <merge commit of the restructure>` (or revert the
   commit range if it was not merged as one). This restores the earlier screens, tests and documents.
   To compare with the checkpoint at any time: `git diff checkpoint/pre-restructure-2026-10-03 HEAD`.
4. **Check it:** `cd mobile && npm run check`, then `npm start` and open the app on the phone.
5. **Open a pull request** and merge it the normal way.

To look at the old version without changing anything: `git switch -c restore/previous-layout checkpoint/pre-restructure-2026-10-03`.

## The compatibility issue you must know about (explained before any action)

The earlier layout had **no concept of dated spending records, effective-dated budgets, a savings ledger or month-end
results.** So after a rollback:

- The old screens **cannot display** spending you recorded, savings movements, or finished-month results. They are
  **not lost**: they stay in the phone's storage and in your exported copy, and appear again if the new layout is
  re-applied.
- Anything entered **in the old layout** after a rollback is held in memory only (as before) and is **not** merged into
  the saved records.
- If you want the new records to stay visible after a rollback, the alternative is to keep the new layout and change it
  instead of reversing it. Say so and I will not revert.

## What the new version does to data (for the record)

- **Before this restructure the app saved nothing**, so there were no existing user records to migrate or lose.
- The saved format is versioned (`schemaVersion: 2`). Before any migration, and before touching data that cannot be
  read, the app writes a backup copy under its own key. Data written by a **newer** app version is never loaded or
  overwritten by an older one.
- Deleting an item never deletes history: deleted budgets, bills and income move to a retired list, and past spending
  is never removed by deleting a budget. See `docs/ARCHITECTURE.md` and ADR 0005.
