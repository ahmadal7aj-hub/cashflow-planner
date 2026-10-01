# Interview kit

Everything needed to run the validation interviews (see `docs/VALIDATION.md` for hypotheses, questions
and prototype tasks). This repo is public: **never put participant names, contacts, real figures or raw
notes here.** Use an ID such as `P01` and keep real notes in `docs/private/` (git-ignored) or another
private store.

## Who to recruit (primary hypothesis)

Salaried UAE residents who pay recurring monthly commitments (rent, utilities, loans, school fees,
subscriptions). Aim for a mix of: expat and Emirati, single and family households, lower and higher
income, and iPhone and Android. Target 20-30 interviews and at least 10 prototype sessions.

## Screener (ask before booking)

1. Are you paid a monthly salary? (yes required)
2. Do you have at least three recurring monthly payments? (yes required)
3. Roughly how often are you unsure if you can afford something before payday? (never / sometimes / often)
4. Which finance or banking apps do you use? (open)
5. Do you have an iPhone or an Android phone?

Record only the answers needed to balance the sample, under the participant ID.

## Consent script (read aloud)

"Thanks for helping. This is a research conversation about managing money, not a sales call. I will take
notes. You can skip any question or stop at any time. I will not ask for real account numbers or balances.
The prototype uses made-up numbers. Your notes are stored under a code, not your name, and I will not
share anything that identifies you. Is it okay to proceed and take notes?"

Get a clear verbal yes. If recording audio, ask separately and get a separate yes.

## Session plan (30-40 minutes)

1. Consent and warm-up (3 min).
2. Interview questions from `docs/VALIDATION.md` (15-20 min). Do not mention the product yet.
3. Show the prototype (`cd mobile && npm start`, open in Expo Go) and run tasks T1-T6 (10-15 min). Think
   aloud; do not coach.
4. Wrap-up: "What would make you use something like this weekly?" and "What is missing?" (3 min).

## Note template (copy into your private store, one per participant)

```
Participant: P__   Date: __   Platform: iOS/Android   Household: __
Screener: salary yes/no, recurring payments, "unsure before payday" frequency
Pain moments (their words):
Current tools and workarounds:
Surprise payments mentioned:
Manual entry attitude (H3):
Month vs payday thinking (H4):
Paid for a finance tool before? Price expectation (H5):
Statement import interest (ADR 0004 item 5):
Prototype tasks T1-T6: done? time? confusion? quotes:
Top 3 takeaways:
```

## After each batch of five interviews

Add anonymized, aggregated findings to the Results table in `docs/VALIDATION.md`, update which
hypotheses (H1-H5) are supported or refuted, and revisit the "after interviews" items in ADR 0004.
Stop and review against the BRD go/no-go checkpoints before starting Phase 2.
