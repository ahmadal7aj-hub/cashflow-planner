import type { Fils } from './money';
import type { Commitment, ForecastInput } from './prototypeForecast';
import type { IncomeKind } from './uaeCategories';

/**
 * Editable plan model (prototype). Pure functions only; integer fils; no UI or storage here.
 *
 * Budget cycle assumption: budgets run payday to payday. A variable budget's `spentSoFar` is what is
 * already spent this cycle, so `amount - spentSoFar` is what is still expected before payday.
 */
export type Frequency = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export const FREQUENCIES: readonly Frequency[] = [
  'once',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: 'One-off',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  annual: 'Yearly',
};

const PERIOD_DAYS: Record<Exclude<Frequency, 'once'>, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  annual: 365,
};

export interface ExpenseItem {
  id: string;
  name: string;
  categoryId: string;
  /** Fixed: amount per occurrence. Variable: the budget for one cycle. */
  amount: Fils;
  frequency: Frequency;
  /** Days from today until the next occurrence (fixed items). */
  nextDueInDays: number;
  kind: 'fixed' | 'variable';
  essential: boolean;
  /** Variable items only: already spent this cycle. */
  spentSoFar: Fils;
}

export interface IncomeItem {
  id: string;
  name: string;
  kind: IncomeKind;
  amount: Fils;
  frequency: Frequency;
  nextInDays: number;
  stable: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: Fils;
  saved: Fils;
  monthlyContribution: Fils;
  enabled: boolean;
  /** Optional deadline in days from today. */
  targetInDays?: number;
  /** Marks the goal that counts as the emergency fund (used for months-of-cover). */
  purpose?: 'emergency';
}

/** Used only for the illustrative end-of-service gratuity estimate. */
export interface Employment {
  /** Years of service so far; fractions allowed (4.5 = four and a half years). */
  yearsOfService: number;
  /** Monthly basic wage (not total pay). */
  basicMonthly: Fils;
}

export interface Plan {
  availableCash: Fils;
  safetyBuffer: Fils;
  income: readonly IncomeItem[];
  expenses: readonly ExpenseItem[];
  goals: readonly SavingsGoal[];
  employment?: Employment;
}

/** Average monthly value of a recurring amount. One-off items have no monthly equivalent. */
export function monthlyEquivalent(amount: Fils, frequency: Frequency): Fils {
  switch (frequency) {
    case 'once':
      return 0;
    case 'weekly':
      return Math.round((amount * 52) / 12);
    case 'monthly':
      return amount;
    case 'quarterly':
      return Math.round(amount / 3);
    case 'annual':
      return Math.round(amount / 12);
  }
}

/** Days (from today, 0 = today) on which an item occurs strictly inside the horizon. */
export function occurrenceDays(
  nextInDays: number,
  frequency: Frequency,
  horizonDays: number,
): number[] {
  if (nextInDays < 0 || nextInDays >= horizonDays) return [];
  if (frequency === 'once') return [nextInDays];
  const period = PERIOD_DAYS[frequency];
  const days: number[] = [];
  for (let d = nextInDays; d < horizonDays; d += period) days.push(d);
  return days;
}

const DEFAULT_CYCLE_DAYS = 30;

/** Days until the next salary; this is the planning horizon. Falls back to 30 with no salary. */
export function daysUntilPayday(plan: Plan): number {
  const salary = plan.income.find((i) => i.kind === 'salary');
  return salary ? Math.max(0, Math.floor(salary.nextInDays)) : DEFAULT_CYCLE_DAYS;
}

export function remainingBudget(item: ExpenseItem): Fils {
  return Math.max(0, item.amount - item.spentSoFar);
}

/**
 * Turn the editable plan into the forecast engine input.
 *  - commitments  = fixed expenses with an occurrence inside the horizon
 *  - plannedExpenses = remaining budget of ESSENTIAL variable categories (groceries, fuel, Salik...)
 *  - expectedIncome  = income occurrences inside the horizon (payday salary itself is outside it)
 *  - savingsReserve  = monthly contributions of enabled goals, reserved once per cycle
 * Non-essential variable budgets (dining, shopping...) are what safe-to-spend funds, so they are NOT deducted.
 */
export function deriveForecastInput(plan: Plan): ForecastInput {
  const horizon = Math.max(1, daysUntilPayday(plan));

  const commitments: Commitment[] = [];
  for (const e of plan.expenses) {
    if (e.kind !== 'fixed') continue;
    for (const day of occurrenceDays(e.nextDueInDays, e.frequency, horizon)) {
      commitments.push({
        id: `${e.id}-d${day}`,
        name: e.name,
        amount: e.amount,
        dueInDays: day,
        essential: e.essential,
      });
    }
  }

  const plannedExpenses = plan.expenses
    .filter((e) => e.kind === 'variable' && e.essential)
    .reduce((sum, e) => sum + remainingBudget(e), 0);

  const expectedIncome = plan.income.reduce(
    (sum, i) => sum + i.amount * occurrenceDays(i.nextInDays, i.frequency, horizon).length,
    0,
  );

  const savingsReserve = plan.goals
    .filter((g) => g.enabled)
    .reduce((sum, g) => sum + g.monthlyContribution, 0);

  return {
    availableCash: plan.availableCash,
    expectedIncome,
    daysUntilPayday: daysUntilPayday(plan),
    commitments,
    savingsReserve,
    safetyBuffer: plan.safetyBuffer,
    plannedExpenses,
  };
}

/** Unique-id helper for new items; ids only need to be unique within the session. */
export function nextId(prefix: string, existing: readonly { id: string }[]): string {
  let n = existing.length + 1;
  while (existing.some((e) => e.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}
