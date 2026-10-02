# Feature gap and roadmap

What the prototype does today, what common budgeting apps offer, and what could set this app apart.

> **Read this first.**
> - **Competitor columns are unverified.** They come from general knowledge of well-known budgeting apps
>   (for example YNAB, Monarch, Copilot, and UAE-focused apps). No feature-by-feature teardown has been done
>   yet; the BRD lists that as an open gap. Treat every "market offers" entry as a hypothesis to check.
> - **Everything below runs on sample data in memory.** The prototype stores and sends nothing.
> - **Status words:** *Built* = in the prototype. *Planned* = fits the BRD/PRD and is not built. *Deferred* =
>   the BRD says not until validated or approved. *Idea* = not in the BRD/PRD; needs a decision first.
> - The BRD gate still applies: **Phase 2 (accounts, database, real forecast engine) waits for interview evidence.**

## 1. Features common in budgeting apps

| Capability | In this app | Notes |
|---|---|---|
| Category budgets, budget vs spent | **Built** (Spending tab) | Written status (on track / ahead / over), never colour alone |
| Recurring bills and due dates | **Built** (manual entry) | Auto-detection needs transactions, see bank sync |
| Savings goals | **Built** (Savings tab) | Deadline check, pause, emergency-fund flag |
| Sinking funds for yearly bills | **Built** as the "Big bills ahead" planner | Monthly amount needed to be ready on time |
| Income tracking, multiple sources | **Built** (Income tab) | Predictable vs irregular |
| Trends and reports | **Built** with sample history | Real history needs real data (Phase 2+) |
| What-if scenarios | **Built** (Overview) | Isolated from the real plan |
| Alerts and insights | **Built** (Insights tab) | In-app only; push is Phase 5 |
| Push or local reminders | **Planned** (P5-01) | No amounts on the lock screen by default |
| Export and delete my data | **Planned** (P5-02, P5-03) | Never blocked by a paywall (PRD P6-02) |
| Bank account sync | **Deferred** (Phase 7) | Separate legal, regulatory and commercial go/no-go |
| PDF or CSV statement import | **Deferred** | Open decision, ADR 0004 item 5; test demand in interviews first |
| Net worth (assets and liabilities) | **Idea** | Needs accounts and valuation inputs |
| Shared household or partner budgets | **Idea** | Needs accounts, permissions and RLS design |
| Zero-based or envelope budgeting | **Idea** | Today: essential budgets reserved, discretionary funded by safe-to-spend |
| Multi-currency | **Deferred** | Out of scope until demand shown (BRD) |
| Arabic and right-to-left | **Deferred** | Strings are centralised so it is an additive project |
| AI-written insights | **Deferred** | BRD: AI may explain later, never be the source of financial arithmetic |

## 2. What could make this app different

| Differentiator | Status | Notes |
|---|---|---|
| **Safe-to-spend until payday** as the headline | **Built** | Forecast first, tracking second |
| Every number explainable, one tap away | **Built** | Inputs and formula shown; no black-box score |
| **UAE-native categories**: rent, chiller, DEWA, du / e&, Salik, parking, school fees, nanny, domestic help, remittances, car registration, visa and Emirates ID fees | **Built** | Editable; add your own |
| Money sent home treated as a normal essential | **Built** (category) | FX or remittance planner is an **Idea** |
| Termly and yearly bills planned month by month | **Built** | School terms, car registration, visa |
| End-of-service gratuity estimate | **Built, illustrative** | **Not legally verified.** Needs a UAE legal check before it is shown as more than an estimate |
| Awareness of irregular income | **Built** | "How steady is it?" and the Insights note |
| Post-dated rent cheque schedule | **Idea** | Common in the UAE; today each cheque can be a one-off bill |
| Seasonal planning: DEWA in summer, Ramadan and Eid, school terms | **Idea** | Needs real dates, not just sample offsets |
| Salik and parking top-up reminders | **Planned** | Depends on notifications (P5-01) |
| Renewal reminders: visa, Emirates ID, car registration | **Planned** | Partly covered by yearly bills today |
| Debt payoff planner for loans and cards | **Idea** | Deterministic maths; fits the engine rules |
| Gold savings with weight and price | **Idea** | A price feed is external data and needs a decision |
| Zakat estimator | **Not planned yet** | Needs scholarly and legal review; keep out until reviewed |

## 3. What "enterprise grade" would require

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

## 4. Suggested order

1. **Validate** (interviews and prototype sessions). This decides which ideas above matter. Nothing else moves
   until the BRD gate is met.
2. **Phase 2** foundations: auth, schema with RLS, real data entry.
3. **Phase 3** the real forecast engine (replaces the prototype maths, versioned and property-tested).
4. **Phase 5** notifications, export and delete, observability, backups.
5. Then pick from the **Idea** and **Planned** rows by interview evidence: remittances, cheque schedule,
   seasonal planning and the debt planner are the strongest candidates for UAE residents.

## 5. Open checks before relying on this document

- Do a real competitor teardown (YooToo, YNAB, Monarch, Copilot) and replace the unverified entries.
- Get a UAE legal read on the gratuity estimate and on the wording of insights, so nothing reads as advice.
- Confirm with interviewees which differentiators they actually care about.
