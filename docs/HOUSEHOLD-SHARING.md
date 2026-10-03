# Household sharing: requirements and design notes

Status: **requirements captured from the owner (2026-10-03). Not built. Phase 2, gated on interview evidence.**
Source: owner's request. Open items are marked **Decision needed**.

## What the owner wants

1. Each person has an account (unique username, email sign-in, password) and can **link to another user**, who must
   accept; both sides are then linked to each other (for example a couple).
2. Connecting does **not** share anything by itself. Both people are told that sharing is possible.
3. Each person **chooses what to share, separately and optionally**, from three categories:
   - **Savings**
   - **Spending**
   - **Upcoming essential spending**
4. Any combination works, including sharing nothing: for example savings only; savings and spending; or
   spending and upcoming essentials without savings.
5. Once connected, a **Household tab appears** and shows the shared information, **monthly**.
6. The feature is **available to everyone**, not a paid or special tier (pricing is undecided; see the BRD).

## Behaviour rules (proposed)

- **Consent is per person and per category, and one-directional.** What I choose to share is what the other person
  sees. If she shares savings and I do not, she sees my nothing and I see her savings.
- **Combined totals only count what both sides shared.** The household total for a category is the sum of the people
  who shared it, and the screen says who is included, so a total is never mistaken for the full household.
- **Either person can stop sharing a category, or disconnect, at any time.** It takes effect immediately and the other
  person no longer sees that data. Plain wording, no guilt.
- **Item-level sharing (owner's example, 2026-10-03):** next to each saving amount or expense there is a **Share**
  button. Tapping it shares that one item with the linked user and it appears on a separate **Shared dashboard**
  page. Example: after payday, put AED 5,000 aside as savings and mark it shared, so the shared dashboard shows a
  shared AED 5,000; mark the rent as an upcoming essential spend of AED 5,000, so it shows there too. Category
  switches (savings, spending, upcoming essentials) remain as a quick way to share everything in a category.
  Un-sharing an item removes it from the other person's view immediately.
- **Separate pages:** the individual dashboard is never mixed with the Shared dashboard.
- **Safe to spend is never shared**: it depends on private details (cash, buffer, goals).
- **Invitation flow:** one person invites (a code or link); the other accepts. Nothing is visible before acceptance.
  The invitation expires.
- **The Household tab appears only while at least one connection exists**, and each section shows an explanation if the
  other person shares nothing yet ("Not shared yet").

## Why this is Phase 2

The data must live on a server both people can reach, with accounts and strict rules so one user can never read
another's data unless they chose to share it. In the BRD plan that means Supabase with Row Level Security and
automated cross-user denial tests. None of this exists in the prototype.

## Data design sketch (for Phase 2)

- `connections`: id, user_a, user_b, status (pending, active, ended), created_at.
- `sharing_settings`: connection_id, owner_user, share_savings, share_spending, share_upcoming_essentials
  (all default false), updated_at.
- Shared views return **monthly aggregates computed by the server** from the owner's data, only for categories the
  owner enabled. Row Level Security: a connected user may read a row only if the owner's flag for that category is
  true and the connection is active.
- Audit events for connect, accept, share change and disconnect. No amounts in logs or analytics.

## Decisions needed

1. **Storage:** cloud vs on-device (open in `HANDOVER.md` section 5). Sharing effectively needs the cloud.
2. **More than two people?** A couple is clear. Families or friends would need group rules.
3. **Upcoming essential spending:** which items count (the existing essential categories and bills due in the month)?
4. **Notify the other person** when sharing settings change?
5. **Legal and privacy:** UAE PDPL consent and data-sharing wording, reviewed before launch.
6. **Does the household view use a calendar month or the pay cycle?** The owner said monthly.

## What can be built before Phase 2

A **Household preview** tab with a made-up partner and in-memory sharing toggles, so the owner and a spouse can judge
the layout and the sharing choices. It would be labelled as a mock-up, store nothing, and connect no one. Useful for
interviews: ask couples whether they would share, and which categories.
