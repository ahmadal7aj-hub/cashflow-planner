# Feature gap and roadmap

What the prototype does today, what competing apps offer, and where this app could be different.

> **How to read this**
> - **Competitor information was researched on 2026-10-02** from each vendor's own public pages and from
>   web search results. It is **vendor marketing, not independently tested.** A feature that a page does not
>   mention is **not proof it is absent.** Prices are as listed that day and change.
> - **Everything in the prototype runs on sample data in memory.** It stores and sends nothing.
> - **Status words:** *Built* = in the prototype. *Planned* = fits the BRD/PRD, not built. *Deferred* = the BRD says
>   not until validated or approved. *Idea* = not in the BRD/PRD; needs a decision.
> - The BRD gate still applies: **Phase 2 (accounts, database, real forecast engine) waits for interview evidence.**

## 1. Competitor snapshot (researched 2026-10-02)

| Product | What it claims | Listed price | Sources |
|---|---|---|---|
| **YooToo** (UAE) | Category budgets with limit alerts; PDF statement import from major UAE banks; payslip upload (WPS and standard formats); receipt scanning; recurring-bill detection with reminders; donut charts, daily burn rate and **month-end projection**; CSV export; categories for rent, **DEWA, Salik, Nol and school fees**; AED; English only; data kept in a private database on the phone, no account needed, Face ID / PIN | Free with in-app purchases; Pro $7.99 a month or $59.99 a year | [App Store listing](https://apps.apple.com/us/app/yootoo-uae-budget-tracker/id6761253882) |
| **YNAB** | Bank import, goals, debt-payoff loan calculator, spending and net-worth reports, mobile widgets, offline access, sharing with up to six people | $14.99 a month or $109 a year; 34-day trial | [Features page](https://www.ynab.com/features) |
| **Monarch** | Category and "flex" budgets, goals (save up and pay down), net worth, recurring-bill recognition, cash-flow reports, **forecasting of cash flow and net worth with life events (Plus tier)**, free household sharing, AI features | Core and Plus tiers (prices not captured) | [Forecasting help](https://help.monarch.com/hc/en-us/articles/48344305092244-Forecasting-in-Monarch), [Budgeting](https://www.monarch.com/features/budgeting), [Goals](https://help.monarch.com/hc/en-us/articles/15000751305108-Using-Goals) |
| **Copilot** | AI categorisation, rollover budgets, recurring detection, cash-flow summaries, net worth, investments, real-estate value tracking; web, iPhone, Mac, iPad | $7.92 a month or $95 a year | [Site](https://www.copilot.money/) |
| **FinArt** (UAE-focused) | Parses bank SMS, email and app notifications (Android), and SMS, email, Apple Pay and **PDF statements** (iPhone), with no bank login; multi-currency with real-time conversion; a Private Mode that keeps data on the device; backups to your own Google Drive or iCloud; no third-party trackers. **Arabic not mentioned** | Free 5-day trial, then paid (not captured) | [Vendor page](https://finart.app/best-expense-tracker-app-uae/) (vendor marketing) |
| **Pocket Clear** (UAE-focused) | Works offline; no bank linking; tracks in AED while showing amounts in a home currency (INR, PHP, GBP, USD...). **Arabic not mentioned** | Free with no ads; optional Pro (about $4.99 a month per the page metadata) | [Vendor page](https://pocketclear.app/blog/expense-tracker-uae.html) (vendor marketing) |
| **Wally** (Middle East) | 200+ currencies, receipt scanning, location-based categorisation, natural-language insights; reported to support Arabic; claims ISO 27001, PCI and GDPR compliance. **Not read from Wally's own site** | Free basic plan; a paid tier reported at about Dh40 a month or Dh150 a year, and $4.99 a month on another platform | [Wamda article (2023)](https://www.wamda.com/2023/12/evolution-wally-expenses-tracking-personal-finance-ai), [App Store](https://apps.apple.com/us/app/wally-simple-budget-tracker/id6740695744), search results (secondary) |

## 2. Feature comparison

| Capability | This app | Competitor evidence |
|---|---|---|
| Category budgets, budget vs spent | **Built** | Common to all |
| UAE categories (Salik, Nol, DEWA, school fees, rent) | **Built** (30 categories, editable) | **Already offered by YooToo.** Table stakes, not a differentiator |
| Month-end or cycle projection | **Built** (until next payday) | YooToo: month-end projection. Monarch: forecasting (Plus) |
| Recurring bills and reminders | **Built** (manual); reminders **Planned** (P5-01) | YooToo detects and reminds. Monarch and Copilot detect |
| Savings goals | **Built** | YNAB, Monarch; debt-payoff in YNAB and Monarch |
| Sinking funds for yearly and termly bills | **Built** (Big bills planner) | Not mentioned on the pages checked |
| What-if purchase scenario | **Built** | Not mentioned on the pages checked (Monarch models life events) |
| Income by source, steadiness | **Built** | Not mentioned on the pages checked |
| Plain-language insights | **Built** | Copilot and Monarch advertise AI features |
| Export and delete my data | **Planned** (P5-02, P5-03) | YooToo offers CSV export |
| **Automatic data capture** (bank sync, PDF or CSV import, SMS or email parsing) | **Deferred** (Phase 7; import is an open decision) | YNAB, Monarch, Copilot sync; **YooToo imports UAE bank PDFs**; **FinArt parses SMS, email and PDF statements without a bank login** |
| Receipt scanning, payslip upload | **Idea** | YooToo |
| Arabic and right-to-left | **Deferred** | Wally reported to support it; **FinArt and Pocket Clear pages do not mention it**; YooToo is English only |
| Multi-currency, remittances | **Deferred** | FinArt, Pocket Clear and Wally all advertise it (vendor pages and listings) |
| Net worth, investments | **Idea** | YNAB, Monarch, Copilot |
| Shared household budgets | **Idea** | YNAB (up to six), Monarch (free) |
| Rollover budgets | **Idea** | Copilot |
| AI categorisation | **Deferred** | Copilot. BRD: AI must never be the source of financial arithmetic |
| Local-only private data (no account) | **Not the current plan** | **YooToo markets this; FinArt offers an on-device Private Mode and backups to your own cloud.** The BRD architecture is cloud-based (Supabase) |

## 3. Where this app could be different (hypotheses to test, not proven)

These are what the prototype does that the pages checked **did not mention**. Whether people value them is what
the interviews must show.

1. **A payday-cycle "safe to spend" figure as the headline**, with the formula one tap away and no black-box score.
2. **An isolated what-if** before a large purchase.
3. **Yearly and termly bills turned into a monthly set-aside**, with the exact amount needed to be ready on time.
4. **Awareness of irregular income** and how much of your spending depends on it.
5. **Emergency fund shown in months of essential spending.**
6. **Neutral, explainable insights** with no shame or manufactured urgency (a PRD rule).
7. **End-of-service gratuity estimate** (illustrative; **not legally verified**, needs a UAE legal check).

**Not differentiators:** UAE-specific categories and a month-end projection (YooToo has both).

## 4. Risks this research exposes

| Risk | Why it matters | Suggested response |
|---|---|---|
| **Manual entry is the biggest adoption risk** | Several competitors capture data automatically without a bank login (YooToo imports UAE bank PDFs; FinArt reads SMS, email and PDFs). Hypothesis H3 (users will maintain inputs) now carries more weight | Ask about import in every interview. Consider testing a PDF or CSV import earlier than the BRD sequence suggests (see ADR 0004, item 5) |
| **Privacy positioning** | YooToo markets local-only storage and no account. A cloud database is a trust trade-off for a financial app | Decide deliberately: cloud, local-first, or hybrid. Ask interviewees how they feel about it |
| **Multi-currency is likely expected; Arabic is less clear** | FinArt, Pocket Clear and Wally advertise multi-currency, and remittances are common for UAE residents. Only Wally is reported to offer Arabic; two others do not mention it | Test demand; keep strings centralised so Arabic is additive |
| **Price anchors** | YooToo Pro is $59.99 a year; Copilot $95; YNAB $109 | Ask willingness-to-pay in interviews; do not set a price yet |
| **Crowded UAE market** | At least five UAE-focused apps appear in roundups | Differentiate on the hypotheses above, and validate before building more |

## 5. What "enterprise grade" would require

None of these exist yet. The first group is already **mandatory in the BRD** before production; the second
is **beyond the BRD** and would be a business decision.

**Required by the BRD before production**

- Managed authentication with email verification, secure sessions, rate limiting, optional MFA.
- Row Level Security on every table with automated cross-user denial tests.
- Audit events, encryption at rest and in transit, no financial values in logs or analytics.
- Backups with point-in-time recovery and a recorded restore drill.
- Error monitoring with PII scrubbing, uptime checks, an incident response plan, RPO/RTO targets.
- Threat model, OWASP MASVS mapping, penetration and code review, dependency and secret scanning.
- UAE PDPL review, privacy notice and consent, data map, retention and deletion.
- Accessibility pass, store-readiness, release gates and tested rollback.

**Beyond the BRD (ideas to decide on, not commitments)**

- Employer or bank partnerships (a business-to-business offer) and an admin console.
- Single sign-on for corporate users, data-residency options, and service-level targets.
- Independent security certification, only if a customer requires it.

## 6. Suggested order

1. **Validate** (interviews and prototype sessions). Use section 4 to shape the questions. Nothing else moves
   until the BRD gate is met.
2. **Decide the data question** (cloud, local-first or hybrid) and whether import is table stakes, before Phase 2.
3. **Phase 2** foundations: auth, schema with RLS, real data entry.
4. **Phase 3** the real forecast engine (replaces the prototype maths, versioned and property-tested).
5. **Phase 5** notifications, export and delete, observability, backups.
6. Then pick from the **Idea** rows by interview evidence. Candidates for UAE residents: remittances and
   multi-currency, a post-dated rent-cheque schedule, seasonal planning (DEWA in summer, Ramadan and Eid,
   school terms), and a debt-payoff planner.

## 7. Still to check

- Capture Monarch's prices (its pricing page did not show them) and read Wally's own site; Wally is currently sourced from listings and press.
- Install the competing apps and test the flows directly; marketing pages overstate and understate.
- Get a UAE legal read on the gratuity estimate and on the wording of insights, so nothing reads as advice.
- Confirm with interviewees which differentiators they actually care about.
