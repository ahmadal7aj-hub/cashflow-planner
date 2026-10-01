# ADR 0003: Prototype planning horizon and calculation assumptions

- Status: Accepted for Phase 1 (prototype only); to be revisited after validation interviews
- Date: 2026-10-01

## Context

PRD section 16 leaves the planning-horizon rule open (next payday vs calendar month vs user choice) and the default safety-buffer policy open. The prototype must still show consistent numbers, and its what-if scenario needs a single, explainable formula.

## Decision

For the prototype only, `src/domain/prototypeForecast.ts` uses:

- **Horizon:** today until the day **before** the next payday, so payday salary is not counted.
- **Today counts** as a spend day; a commitment due today is reserved; one due on payday is not.
- **Money** is integer fils; the daily amount is floored.
- **Safe-to-spend** and **forecast balance** follow PRD section 5: the former subtracts the safety buffer, the latter does not. A negative raw result is shown as a separate shortfall and the allowance is clamped to zero.
- The safety buffer is user-entered with a sample default; the product does not recommend one yet.
- A calculation version string (`prototype-0.1`) is attached to every result.

## Consequences

- Prototype numbers are hand-verified in tests, and the explain screen states the assumptions to participants so we can test them (hypothesis H4 in `docs/VALIDATION.md`).
- This module is **not** the Phase 3 engine. P3-01..P3-05 will replace it with the versioned, property-tested engine, and the horizon decision must be made before then.
