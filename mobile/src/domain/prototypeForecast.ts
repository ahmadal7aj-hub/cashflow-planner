import type { Fils } from './money';

/**
 * PROTOTYPE forecast (Phase 1 only). Pure, deterministic, integer fils.
 * The real, versioned engine arrives in Phase 3 (P3-01..P3-05) and replaces this module;
 * the formulas below follow PRD section 5 so prototype numbers match what we will build.
 *
 * Assumptions made explicit for validation (PRD section 16 is still open):
 *  - Planning horizon = today until the day BEFORE next payday (so payday salary is not counted).
 *  - "Today" counts as a spend day.
 */
export const CALCULATION_VERSION = 'prototype-0.1';

export interface Commitment {
  id: string;
  name: string;
  amount: Fils;
  /** Days from today (0 = today). Only commitments inside the horizon are reserved. */
  dueInDays: number;
  essential: boolean;
}

export interface ForecastInput {
  availableCash: Fils;
  /** Expected income received inside the horizon (excludes payday salary by assumption above). */
  expectedIncome: Fils;
  daysUntilPayday: number;
  commitments: readonly Commitment[];
  savingsReserve: Fils;
  safetyBuffer: Fils;
  plannedExpenses: Fils;
}

export type WarningKind = 'shortfall' | 'tight-buffer' | 'commitment-due-soon';

export interface ForecastWarning {
  id: string;
  kind: WarningKind;
  severity: 'high' | 'medium' | 'low';
  /** Day offset the warning refers to. */
  dayOffset: number;
  amount: Fils;
  commitmentName?: string;
}

export interface ForecastResult {
  calculationVersion: string;
  horizonDays: number;
  availableCash: Fils;
  /** Income expected inside the horizon (assumed received on day 0). */
  expectedIncome: Fils;
  reservedCommitments: Fils;
  /** Commitments that fall inside the horizon, soonest first. */
  upcoming: readonly Commitment[];
  savingsReserve: Fils;
  safetyBuffer: Fils;
  plannedExpenses: Fils;
  /** Unclamped result of the safe-to-spend formula. */
  rawSafeToSpend: Fils;
  /** Never negative. */
  safeToSpend: Fils;
  /** Positive amount by which the plan is short; 0 when there is no shortfall. */
  shortfall: Fils;
  dailySafe: Fils;
  /** Balance on the last day of the horizon (no safety buffer deducted). */
  forecastBalance: Fils;
  warnings: readonly ForecastWarning[];
}

const DUE_SOON_DAYS = 5;

export function computeForecast(input: ForecastInput): ForecastResult {
  const horizonDays = Math.max(1, Math.floor(input.daysUntilPayday));

  const upcoming = input.commitments
    .filter((c) => c.dueInDays >= 0 && c.dueInDays < horizonDays)
    .slice()
    .sort((a, b) => a.dueInDays - b.dueInDays);
  const reservedCommitments = upcoming.reduce((sum, c) => sum + c.amount, 0);

  const rawSafeToSpend =
    input.availableCash +
    input.expectedIncome -
    reservedCommitments -
    input.savingsReserve -
    input.safetyBuffer -
    input.plannedExpenses;
  const safeToSpend = Math.max(0, rawSafeToSpend);
  const shortfall = rawSafeToSpend < 0 ? -rawSafeToSpend : 0;
  const dailySafe = Math.floor(safeToSpend / horizonDays);

  const forecastBalance =
    input.availableCash +
    input.expectedIncome -
    reservedCommitments -
    input.plannedExpenses -
    input.savingsReserve;

  const warnings: ForecastWarning[] = [];
  if (shortfall > 0) {
    warnings.push({
      id: 'shortfall',
      kind: 'shortfall',
      severity: 'high',
      dayOffset: horizonDays - 1,
      amount: shortfall,
    });
  } else if (safeToSpend < input.safetyBuffer) {
    warnings.push({
      id: 'tight-buffer',
      kind: 'tight-buffer',
      severity: 'medium',
      dayOffset: horizonDays - 1,
      amount: safeToSpend,
    });
  }
  for (const c of upcoming) {
    if (c.dueInDays <= DUE_SOON_DAYS) {
      warnings.push({
        id: `due-${c.id}`,
        kind: 'commitment-due-soon',
        severity: 'low',
        dayOffset: c.dueInDays,
        amount: c.amount,
        commitmentName: c.name,
      });
    }
  }

  return {
    calculationVersion: CALCULATION_VERSION,
    horizonDays,
    availableCash: input.availableCash,
    expectedIncome: input.expectedIncome,
    reservedCommitments,
    upcoming,
    savingsReserve: input.savingsReserve,
    safetyBuffer: input.safetyBuffer,
    plannedExpenses: input.plannedExpenses,
    rawSafeToSpend,
    safeToSpend,
    shortfall,
    dailySafe,
    forecastBalance,
    warnings,
  };
}
