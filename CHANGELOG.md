# Changelog

User-visible changes per release. Format: Keep a Changelog.

## [Unreleased]

- Repository and documentation skeleton (P0-01).
- Expo + strict TypeScript app shell with lint, format, tests (P0-01).
- CI, CodeQL, Dependabot (P0-03).
- Branch protection on main and staging (P0-04).
- Clickable validation prototype: onboarding, commitments, dashboard, warning detail, metric explanation, what-if scenario and settings, with sample data only (P1-01).
- Privacy-minimized prototype analytics with an allow-list (P1-02).
- Validation hypotheses, interview guide and usability tasks (P1-03).
- Richer dashboard: day-by-day balance chart to payday with a kept-aside line, and a stacked breakdown of where the money goes, with table view and accessible labels (P1-01).
- Editable income and expenses with standard UAE categories (rent, DEWA, du/e&, Salik, parking, fuel, school fees, remittances, car registration, visa fees...). Edits feed the forecast (P1-01).
- Bottom tab bar (Overview, Spending) and a Spending dashboard: budgets vs spent with on-track / ahead / over status, monthly cost by type, UAE driving costs (Salik, parking, fuel), room left for dining and shopping, and a 6-cycle trend (P1-01).
- Savings dashboard: goal progress with written status and deadline check, emergency-fund cover in months of essential spending, big-bills planner (monthly amount to set aside to be ready on time), unallocated monthly surplus, illustrative end-of-service gratuity estimate, and a 6-cycle saving trend (P1-01).
- Income dashboard (sources and shares, predictable vs irregular income, 60-day arrivals, steadiness, 6-cycle trends) and an Insights tab of plain, non-judgmental notes that link to the numbers behind them (P1-01).
- Feature-gap and roadmap document (built vs planned vs deferred; competitor claims marked unverified).
- Competitor research (YooToo, YNAB, Monarch, Copilot): corrected the feature-gap document, revised the import proposal in ADR 0004, and added import, cloud-vs-local and Arabic/multi-currency questions to the interview guides.
- Verified FinArt and Pocket Clear from their own pages and added Wally from listings; feature-gap document now notes that automatic capture without a bank login is a UAE market pattern.
- Weekly security-exception watch: opens an issue assigned to the owner when a fix is published or an exception is about to expire.
- Fixed (code review): payday-today planning, explain screen income row, over-eager 'ahead of pace' at the start of a cycle, unreadable chart for far-off payday dates, amount overflow, inflated goal deadlines, 'AED 1000' label, dead Delete/Export buttons, duplicate screens on the back stack, repeated onboarding analytics, and one-off income missing from the Income tab.
- Handover documents: new HANDOVER.md (done, current state, decisions, risks, next actions by owner), rewritten ARCHITECTURE.md and TESTING.md, updated README and docs index.
- Real due dates with a calendar date picker (bills, next payment, goal deadlines), bill reminders (on the day, 1 day, 3 days, 1 week, 2 weeks before, or an exact date) shown on the Overview and in Insights, and an Other bill category you can name yourself.
- Current savings balance on the Savings tab: add money, take money out (never more than you have), and apply the end of a pay cycle (income minus spending), which adds if you saved and reduces savings if you spent more than you earned. Recent activity is listed, and the balance is flagged if it goes below zero.
- Investments: track type of investment (stocks, funds and ETFs, gold, crypto, real estate, sukuk/bonds/deposits, business, other), amount put in, what it is worth now, profit or loss, income received (dividends, rent, interest) and a planned monthly contribution that is set aside in the forecast. New Investments screen with allocation by type, summary card on the Savings tab, and investment income counted in the Income tab. Tracking only, not advice.
- New navy and gold theme with light and dark modes (match phone, light or dark in Settings), icons on the tab bar and buttons, a navy hero card for Safe to spend, a redesigned welcome screen, and softer cards. Every text colour pair is checked for WCAG 4.5:1 contrast and the chart colours were validated for both modes.
- Documentation refreshed for the dates, reminders, savings balance, investments and theme work; Jest per-test timeout raised to 20 seconds.
- Accounts and shared savings (ADR 0006): register, confirm by email code, sign in, reset password, groups by invitation, share a saving with a group, a Shared dashboard with combined totals and the same date filters, privacy enforced by row level security. Checkpoints and tested rollback scripts for every database step.
- Local test server (`npm run dev:server`) so two accounts can be tried on phones without a Supabase project.
- Header person icon and My profile (username, email, optional name and phone, send my username).
- Share this saving: Keep private or Shared; Shared picks a group or someone new by username or email, who must accept before seeing anything.
- One Dashboards tab (Overview, Income, Budget, Spending, Savings, Shared), chart-first, with one set of date buttons for all of them.
- Delete my account (server data and this account's records on the phone), the sign-in session in the phone's secure storage, and optional phone reminders for bills (no amounts in the text).
- Handover, privacy map, backend, rollback and testing documents refreshed.
- Invite an email address that has no account yet: the invitation waits 30 days (stored as a hash) and appears when they register; Tell them about the app button.
- `npm run backend:check` to verify a Supabase project is set up correctly; Maestro smoke flow updated for the Dashboards tab.
