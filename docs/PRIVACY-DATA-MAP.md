# Privacy data map

> Draft skeleton (P0-01). UAE PDPL (Federal Decree-Law No. 45 of 2021) is a production design input; legal review required before launch.

| Field / entity                     | Classification | Stored where | Transmitted to | Logged? | Backed up? | Deletion |
| ---------------------------------- | -------------- | ------------ | -------------- | ------- | ---------- | -------- |
| _TBD per PRD section 6 data model_ |                |              |                | No      |            |          |

## Accounts and shared savings (implemented, ADR 0006)

| Field / entity                                            | Classification                           | Stored where              | Transmitted to                       | Logged?                 | Backed up?     | Deletion                                        |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------- | ------------------------------------ | ----------------------- | -------------- | ----------------------------------------------- |
| Email address                                             | Personal data                            | Supabase Auth             | Supabase (to sign in and send codes) | No                      | By Supabase    | Not yet possible in the app (gap)               |
| Username                                                  | Personal data (visible to group members) | `profiles`                | Group members                        | No                      | By Supabase    | With the account (gap)                          |
| Password                                                  | Credential                               | Supabase Auth (hashed)    | Supabase over TLS                    | No                      | By Supabase    | With the account                                |
| Group name, membership, role                              | Personal data                            | `groups`, `group_members` | Members of the group                 | Events only, no amounts | By Supabase    | Leaving removes the member from the active list |
| Shared saving (amount, date, note, deposit or withdrawal) | **Sensitive financial data**             | `shared_entries`          | Accepted members of that one group   | No                      | By Supabase    | Make it private, delete it, leave the group     |
| Group history                                             | Personal data                            | `group_events`            | Accepted members                     | Never contains amounts  | By Supabase    | With the group                                  |
| Income, budgets, spending, personal savings, goals        | **Sensitive financial data**             | The phone only            | **Never sent**                       | No                      | Export my data | Delete items, or uninstall                      |

## Processors

_TBD after legal review (data hosting region, processor list)._

## Analytics and logging rules

Only events in the PRD analytics dictionary; no raw financial values, notes, merchants or tokens.
