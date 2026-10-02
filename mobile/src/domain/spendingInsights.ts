import { monthlyEquivalent, remainingBudget, type ExpenseItem, type Plan } from './budgetModel';
import type { Fils } from './money';
import type { ForecastResult } from './prototypeForecast';
import { EXPENSE_GROUP_LABELS, getExpenseCategory, type ExpenseGroup } from './uaeCategories';

/** Pure spending analytics (prototype). Integer fils; percentages are display-only ratios. */

export const CYCLE_DAYS = 30;
/** Spending more than this multiple of the straight-line pace counts as "ahead of pace". */
const PACE_TOLERANCE = 1.15;
/** Floor on the elapsed fraction used for pace, so a brand-new cycle is not flagged for normal spending. */
const PACE_MIN_ELAPSED = 0.1;

export type PaceStatus = 'on-track' | 'ahead' | 'over';

/** Fraction of the payday-to-payday cycle that has already passed (0..1). */
export function cycleElapsedFraction(daysUntilPayday: number): number {
  const elapsed = (CYCLE_DAYS - Math.max(0, daysUntilPayday)) / CYCLE_DAYS;
  return Math.min(1, Math.max(0, elapsed));
}

export function paceStatus(spent: Fils, budget: Fils, elapsed: number): PaceStatus {
  if (spent > budget) return 'over';
  // Early in a cycle the straight-line pace is near zero, so even a small purchase would look "ahead".
  // Allow at least the first tenth of the cycle's budget before calling it ahead of pace.
  const expected = budget * Math.max(elapsed, PACE_MIN_ELAPSED);
  return spent > expected * PACE_TOLERANCE ? 'ahead' : 'on-track';
}

export interface BudgetLine {
  id: string;
  name: string;
  categoryId: string;
  essential: boolean;
  budget: Fils;
  spent: Fils;
  remaining: Fils;
  /** spent / budget as a ratio, can exceed 1 when over budget. */
  used: number;
  status: PaceStatus;
}

/** Everyday (variable) budgets with how they are tracking, most-used first. */
export function budgetLines(plan: Plan, daysUntilPayday: number): BudgetLine[] {
  const elapsed = cycleElapsedFraction(daysUntilPayday);
  return plan.expenses
    .filter((e) => e.kind === 'variable')
    .map((e) => ({
      id: e.id,
      name: e.name,
      categoryId: e.categoryId,
      essential: e.essential,
      budget: e.amount,
      spent: e.spentSoFar,
      remaining: remainingBudget(e),
      used: e.amount > 0 ? e.spentSoFar / e.amount : 0,
      status: paceStatus(e.spentSoFar, e.amount, elapsed),
    }))
    .sort((a, b) => b.used - a.used);
}

export interface GroupSpend {
  group: ExpenseGroup;
  label: string;
  /** Average monthly amount: fixed bills at their monthly equivalent plus everyday budgets. */
  monthly: Fils;
}

export function monthlyByGroup(plan: Plan): GroupSpend[] {
  const totals = new Map<ExpenseGroup, Fils>();
  for (const e of plan.expenses) {
    const monthly = e.kind === 'variable' ? e.amount : monthlyEquivalent(e.amount, e.frequency);
    if (monthly <= 0) continue;
    const group = getExpenseCategory(e.categoryId).group;
    totals.set(group, (totals.get(group) ?? 0) + monthly);
  }
  return [...totals.entries()]
    .map(([group, monthly]) => ({ group, label: EXPENSE_GROUP_LABELS[group], monthly }))
    .sort((a, b) => b.monthly - a.monthly);
}

export function totalMonthlySpend(plan: Plan): Fils {
  return monthlyByGroup(plan).reduce((sum, g) => sum + g.monthly, 0);
}

/** Salik, parking and fuel: the everyday car costs every UAE driver tracks. */
const UAE_DRIVING_CATEGORIES = ['salik', 'parking', 'fuel'] as const;

export interface SpendingSummary {
  everydayBudget: Fils;
  everydaySpent: Fils;
  /** Budget share used so far (ratio). */
  everydayUsed: number;
  /** Share of the cycle already elapsed (ratio). */
  cycleElapsed: number;
  billsBeforePayday: Fils;
  billCount: number;
  /** Remaining non-essential budgets (dining, shopping...), which safe-to-spend funds. */
  discretionaryRemaining: Fils;
  /**
   * Unclamped safe-to-spend minus discretionaryRemaining. Negative means those budgets cannot all be
   * afforded, and it includes any shortfall the plan already has before discretionary spending.
   */
  discretionaryHeadroom: Fils;
  driving: { spent: Fils; budget: Fils };
}

export function spendingSummary(
  plan: Plan,
  f: ForecastResult,
  daysUntilPayday: number,
): SpendingSummary {
  const variable: ExpenseItem[] = plan.expenses.filter((e) => e.kind === 'variable');
  const everydayBudget = variable.reduce((s, e) => s + e.amount, 0);
  const everydaySpent = variable.reduce((s, e) => s + e.spentSoFar, 0);
  const discretionaryRemaining = variable
    .filter((e) => !e.essential)
    .reduce((s, e) => s + remainingBudget(e), 0);
  const driving = variable.filter((e) =>
    (UAE_DRIVING_CATEGORIES as readonly string[]).includes(e.categoryId),
  );
  return {
    everydayBudget,
    everydaySpent,
    everydayUsed: everydayBudget > 0 ? everydaySpent / everydayBudget : 0,
    cycleElapsed: cycleElapsedFraction(daysUntilPayday),
    billsBeforePayday: f.reservedCommitments,
    billCount: f.upcoming.length,
    discretionaryRemaining,
    discretionaryHeadroom: f.rawSafeToSpend - discretionaryRemaining,
    driving: {
      spent: driving.reduce((s, e) => s + e.spentSoFar, 0),
      budget: driving.reduce((s, e) => s + e.amount, 0),
    },
  };
}
