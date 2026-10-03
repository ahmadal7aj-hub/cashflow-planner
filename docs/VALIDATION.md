# Validation log

Exit gate (Validation stage): 20-30 interviews, at least 10 usability sessions, and repeated evidence that
forecasting / safe-to-spend solves a real recurring problem.

> **Privacy:** this repository is public. Do not record participant names, contact details, real
> finances or raw interview notes here. Keep those in `docs/private/` (git-ignored) or another private
> store, and put only anonymized, aggregated findings in this file.

## Hypotheses

| ID | Hypothesis | Evidence that would support it | Evidence that would refute it |
|---|---|---|---|
| H1 | Salaried UAE residents with recurring commitments want forward-looking clarity more than retrospective charts. | Unprompted mentions of "running out before payday", checking balances anxiously before big bills | Participants say they are comfortable and only want spending reports |
| H2 | "Safe to spend until payday" is a clearer outcome than what existing trackers show. | Participants explain the number correctly without coaching and say it changes a decision | Participants misread it or prefer category charts |
| H3 | Users will keep the manual inputs the forecast needs. | Willingness to list commitments; plausible weekly update habit | Strong resistance to manual entry; demand for bank sync as a precondition |
| H4 | The planning horizon "until the day before next payday" matches how people think. | Participants think in payday cycles | Participants think in calendar months |
| H5 | Willingness to pay exists for forecasting beyond free trackers. | Stated price expectations, current spend on finance apps | Expect it free; no comparable spend |
| H6 | Manual entry is acceptable without automatic import (UAE competitors import bank PDFs) | Participants would maintain inputs, or find import only a nice-to-have | Participants say they would not use an app without import or bank sync |
| H7 | Cloud storage is acceptable for this kind of data (a UAE competitor markets local-only data) | Participants are comfortable with a secure cloud account | Participants insist on data staying on the phone |

## Interview guide (15-20 minutes, before showing the prototype)

1. Walk me through the last time you were unsure whether you could afford something before payday.
2. How do you decide today whether you can spend on something? What do you check?
3. Which tools do you use (banking app, spreadsheet, notes, other apps)? What do you like or dislike?
4. What bills or payments have surprised you? How often?
5. When in the month do you feel the most pressure? How do you cope?
6. Have you paid for any finance or budgeting tool? Why, or why not?
7. How would you feel typing in your salary and bills by hand? What would make that worthwhile? Would importing a bank statement (for example a PDF) matter more?
8. How would you feel about your financial data being stored in the cloud, versus only on your phone? What would make you trust an app with it?
9. Do you send money home or hold money in other currencies? Would you want an Arabic version?

Avoid leading questions. Do not mention the product's solution until the second half.

## Prototype usability tasks (10+ sessions)

Run the prototype (Expo Go). Ask the participant to think aloud and do **not** coach.

| Task | Success criterion |
|---|---|
| T1. Set up your starting numbers and reach your forecast. | Completes without help |
| T2. Say in your own words what "Safe to spend" means. | Explains it as money left after commitments, savings and buffer until payday |
| T3. Find out why the rent warning is showing. | Opens the warning and can describe the reason |
| T4. Find out how the safe-to-spend number was calculated. | Opens the explanation; understands the inputs |
| T5. Check whether a AED 3,000 purchase is affordable. | Uses the what-if and states the outcome |
| T6. Find where to change an assumption. | Reaches settings or edits the numbers |

Capture per task: completed (yes/no), time, errors, confusion points, and the participant's own words.
Do not record real balances. Use Settings > Load sample data for sessions, and do not enter a participant's real figures; the app saves what is entered on that phone.

## Decision gates

Proceed to Core Alpha only if the exit gate above is met and H1-H3 are supported. See the BRD go/no-go
checkpoints for the pause criteria.

## Results (anonymized, aggregated)

| Date | Sessions so far | Hypothesis | Finding | Decision it informs |
|---|---|---|---|---|
| | | | | |
