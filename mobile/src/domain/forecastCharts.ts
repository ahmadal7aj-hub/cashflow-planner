import type { Fils } from './money';
import type { ForecastResult } from './prototypeForecast';

/**
 * Pure chart data derived from a ForecastResult (prototype only; replaced with the Phase 3 engine).
 * The UI renders these values and never recomputes money.
 */

export interface TimelineDay {
  /** 0 = today. */
  day: number;
  /** Balance at the end of the day after commitments due on or before it. Can be negative. */
  balance: Fils;
  /** Names of commitments due on this day. */
  dueNames: readonly string[];
}

export interface BalanceTimeline {
  days: readonly TimelineDay[];
  /** Money kept aside: savings + safety buffer + planned spending. Safe-to-spend is the gap above it. */
  keptAside: Fils;
}

export function buildBalanceTimeline(f: ForecastResult): BalanceTimeline {
  const days: TimelineDay[] = [];
  for (let day = 0; day < f.horizonDays; day++) {
    const due = f.upcoming.filter((c) => c.dueInDays === day);
    const paidSoFar = f.upcoming
      .filter((c) => c.dueInDays <= day)
      .reduce((sum, c) => sum + c.amount, 0);
    days.push({
      day,
      balance: f.availableCash + f.expectedIncome - paidSoFar,
      dueNames: due.map((c) => c.name),
    });
  }
  return { days, keptAside: f.savingsReserve + f.safetyBuffer + f.plannedExpenses };
}

export type SegmentKey = 'safe' | 'commitments' | 'savings' | 'buffer' | 'planned';

export interface BreakdownSegment {
  key: SegmentKey;
  amount: Fils;
}

export interface Breakdown {
  segments: readonly BreakdownSegment[];
  /** Width the bar represents: the larger of the money available and the money spoken for. */
  total: Fils;
  shortfall: Fils;
}

/** Part-to-whole: where the money available goes. Segments with zero amount are dropped. */
export function buildBreakdown(f: ForecastResult): Breakdown {
  const available = f.availableCash + f.expectedIncome;
  const all: BreakdownSegment[] = [
    { key: 'commitments', amount: f.reservedCommitments },
    { key: 'savings', amount: f.savingsReserve },
    { key: 'buffer', amount: f.safetyBuffer },
    { key: 'planned', amount: f.plannedExpenses },
    { key: 'safe', amount: f.safeToSpend },
  ];
  const segments = all.filter((s) => s.amount > 0);
  const total = Math.max(
    available,
    segments.reduce((sum, s) => sum + s.amount, 0),
  );
  return { segments, total, shortfall: f.shortfall };
}
