# Accounts, groups and shared savings

How it works, what other people can and cannot see, and what happens to history when things change. The decisions are
recorded in `adr/0006-accounts-and-shared-savings.md`; the setup is in `BACKEND-SETUP.md`.

## What is private and what is shared

| Information                                                                                    | Who can see it                                                                     |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Income, budgets, bills, spending, goals, investments                                           | Only you, on your phone. They are never sent.                                      |
| Your personal savings total and your private savings                                           | Only you.                                                                          |
| A saving you chose to **Share** (amount, date, note, whether it was a deposit or a withdrawal) | The accepted members of the one group you chose                                    |
| That you belong to a group, your username                                                      | The accepted members of that group                                                 |
| Your email address                                                                             | Only you (and the sign-in service). Others can invite you by it, but never see it. |

**Sharing displays the same record in another view.** It does not copy the amount into anyone's personal total, move
money, or add another person's contribution to yours.

## Accounts

- Register with a **unique username** (3 to 20 letters, numbers or underscores), a **unique email** and your own
  **password** (at least 10 characters). A code is emailed; type it in to confirm the address.
- **Sign in** with email and password. **Sign out** from Settings, Account and groups. **Reset a forgotten password** with
  a code sent to the email (the screen never says whether an email has an account).
- Each account keeps its own saved records on the phone. The first account to sign in on a phone takes over the records
  that were already there (a copy, with a backup). Anyone who signs in later starts empty.

## Groups and invitations

- Anyone can start a group (a pair is just a group of two; up to 20 people). The creator is the group's admin.
- An admin **invites** someone by username or email. The invitation does nothing until the person **accepts**. A pending
  invitee sees only the group name and who invited them; nothing else, and no shared savings.
- The app never says whether an invited username or email has an account.
- A member can **leave** at any time. An admin can **remove** a member or cancel an invitation. Both ask first and explain
  the effect.

## Sharing a saving

- Savings are **private by default**. When you add or edit a saving, choose a group under **Share this saving** (or keep
  it private). A saving belongs to one group at a time; to move it, make it private and share it again.
- Only manual deposits and withdrawals can be shared, not the automatic month-end results (those come from your private
  income and spending).
- Only the **owner** can edit, make private or delete a shared saving. Other members see it read-only. Editing or deleting
  the saving on your phone updates the shared copy; there is one record, so it is never counted twice.
- If you are offline, the saving is kept on your phone and sent when you are back online.

## The Shared Savings dashboard

A **Shared Savings** tab appears in every accepted member's account once any of their groups has a shared saving. It shows,
for the chosen group and dates: the combined **period** or **total** savings, each member's contribution, the shared
entries, and the group history. Members of several groups choose the group at the top; each group's records and totals are
kept apart. Every member sees the same numbers, because the totals are worked out once, in the database.

- **Dates:** default is this month. Presets: This month, Last week (previous Monday to Sunday), Last month, Last quarter,
  Last year, and a **Custom date range** typed as `YYYY-MM-DD` (any valid start and end: ten days, a month, two years).
  The chosen dates are always shown. Changing dates changes only the view.
- **Period savings:** deposits minus withdrawals dated inside the chosen dates.
- **Total savings:** the cumulative shared balance at the end of the chosen dates (never later than today).
- Nobody's opening balance, savings target or projection is part of the shared totals; only shared entries are.

## What happens to history (so there are no surprises)

| What happens                                      | Effect on shared totals                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| You share an **older** saving                     | It appears at **its own date**. Totals for earlier periods that include that date change. The entry shows "Shared on" the date it became visible.                                                      |
| You **make a saving private** (or delete it)      | It disappears from every member's totals for **all dates**. The history keeps a note that a saving was made private, with no amount.                                                                   |
| You **leave** a group, or an admin removes you    | All your shared savings in that group become private again and disappear from its totals for all dates. Your own records are not changed. The history keeps "left the group". You lose access at once. |
| You **edit** a shared saving                      | The one shared record changes; totals for the dates involved change.                                                                                                                                   |
| A date before the group's **first** shared saving | The screen says no shared savings were recorded; it does not show zero as if it were a balance.                                                                                                        |

## Limits of this version

- Personal records are on one phone: signing in on a second phone does not bring them over (shared savings do show).
- No account deletion, no invitations to people who have not registered, no two-factor sign-in.
- Not yet tested against a live Supabase project (see `BACKEND-SETUP.md`), and not yet reviewed under UAE PDPL.
