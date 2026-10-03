# Prototype walkthrough script

Use with `docs/INTERVIEW-ONE-PAGER.md`. The app saves what is entered **on that phone only** (nothing is sent). For a
session, use **Settings, then Load sample data** so no participant enters real figures.

## Setup (before the session)

1. On your computer: `cd mobile && npm start`.
2. On the participant's phone (or yours): open **Expo Go**, scan the QR code. Both devices must be on the same Wi-Fi.
3. Confirm you see "UAE Cash-Flow Planner" and an orange "DEVELOPMENT build" strip. That strip is expected; tell the
   participant it is a test version.
4. Tap **Get started**, then **Save and continue** on the savings questions (zero is fine). Then on the Dashboard open
   **Settings** and tap **Load sample data**.

## The five pages

- **Dashboard.** The default range is the current calendar month (the dates are shown). Presets: Current month, Last
  week (previous Monday to Sunday), Last month, Last quarter, Last year, and a **Custom range** typed as `YYYY-MM-DD`.
  It shows income, spending against budget, and savings, with a toggle between **This month's savings** (net added in
  the range) and **Total savings** (the cumulative balance at the end of the range). Changing the range never changes
  the data.
- **Income.** Add item, then choose a category (salary, allowance, bonus, side work, rental, investment, other), amount,
  how often, the next payment date and whether it is predictable. Zero is allowed.
- **Savings planning.** Existing savings (with the date it started), the monthly target (a plan, not money saved), a
  projection for the unfinished month (labelled projected), add and take out money, finished months, goals, and an
  Investments screen.
- **Budgeting.** **Bills and fixed expenses** (a due date, a reminder, **Mark as paid**) and **Everyday budgets** (a
  monthly amount per category, for example groceries AED 3,000). Every category stays available in the form.
- **Actual spending.** Add each purchase (category, amount, date). Every category shows the monthly budget, what was
  spent and the remaining balance; an overspend shows as a negative amount ("Over by"), and spending in a category with
  no budget is labelled **Unbudgeted**.

## What the sample data looks like (so you can spot misunderstandings)

Spendable balance AED 12,000, safety buffer AED 300, payday in 12 days. Bills due before payday total AED 7,080: rent
AED 3,500 (in 4 days), DEWA 450 (6), internet and mobile 380 (8), car loan 1,300 (9), health insurance 250 (10), money
sent home 1,000 (11), gym 200 (11). Essential everyday budgets still expected: AED 1,650. Expected on the Dashboard:
**Safe to spend AED 1,770.00**, **AED 147.50 per day**, **expected balance AED 2,070.00**. The what-if laptop (AED
3,000) shows a **AED 1,230.00** shortfall. Existing savings AED 23,600.00, monthly target AED 1,200.00. Investments:
worth **AED 47,100.00** against **AED 43,000.00** put in, a profit of **AED 4,100.00 (+9.5%)**.

## How savings react to spending (worth showing)

At the end of a month: **result = income received - actual spending**. Savings grow by the result, **never by more than
the monthly target**, and **if the result is negative the shortfall comes out of existing savings**. Example with
opening AED 5,000 and a AED 1,000 target when income equals the plan plus the target: overspending of AED 300 saves AED
700 (closing AED 5,700); overspending of AED 1,200 saves nothing and takes AED 200 from savings (closing AED 4,800).
Underspending in one category offsets overspending in another because only the overall totals count.

## Deleting

Open an item and use **Delete** (it asks again, with Keep it), or **swipe a card left** to reveal a red **Delete**
button (it asks for confirmation with Cancel). Deleting a budget never deletes past spending.

## Say to the participant

"This is an early test version with made-up numbers. There are no right or wrong answers; if something is confusing,
that is useful for me. Please say what you are thinking out loud."

## Tasks (read one at a time; do not help)

| Task | Say                                                                           | Watch for                                              | Success                                         |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| T1   | "Add your salary and a budget for groceries."                                 | Finds Add item; picks a category; understands the date | Both appear as cards                            |
| T2   | "You bought groceries for 300 today. Record it and tell me how much is left." | Finds Actual spending; reads Remaining                 | States the remaining balance                    |
| T3   | "Is any category over budget?"                                                | Reads the red status and "Over by"                     | Names the category                              |
| T4   | "How much have you saved so far, and how much did you add this month?"        | Total savings versus This month's savings              | Tells the two apart                             |
| T5   | "Show me last month."                                                         | The range chips                                        | Dashboard shows last month's dates              |
| T6   | "Remove a bill you do not have."                                              | Swipe or open the item                                 | Confirms, then it is gone                       |
| T7   | "Could you afford a AED 3,000 laptop right now?"                              | The what-if on the Dashboard                           | States the outcome; knows the plan is unchanged |

## Follow-up questions (after tasks)

- "What was the most useful thing on that screen? What did you ignore?"
- "Was anything worrying, confusing or wrong-looking?"
- "Would you record your spending every day? What would stop you?" (H3, manual entry is the biggest adoption risk)
- "Would you share savings or spending with a partner? Which parts?" (see `docs/HOUSEHOLD-SHARING.md`)
- "Would a weekly or monthly email summary be useful?" (needs accounts; Phase 2)
- "What would you expect to pay for this, if anything? What would feel too much?" (H5)

## After the session

1. Write the private notes (see the note template in `docs/INTERVIEW-KIT.md`).
2. If a number looked wrong to the participant, note which screen and what they expected. Do not change the sample data
   mid-study unless it is clearly broken; record any change and the date.
3. Never save screenshots that show a participant's real data.
