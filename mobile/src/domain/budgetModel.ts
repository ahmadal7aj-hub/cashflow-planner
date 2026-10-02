import { daysBetween, nextOnOrAfter, type ISODate } from './dates';
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
  /** Real due date of the first (or only) occurrence. When set, it overrides `nextDueInDays`. */
  dueDate?: ISODate;
  /** Fixed bills: remind this many days before each due date (0 = on the day). */
  reminderDaysBefore?: number;
}

export interface IncomeItem {
  id: string;
  name: string;
  kind: IncomeKind;
  amount: Fils;
  frequency: Frequency;
  nextInDays: number;
  stable: boolean;
  /** Real date of the next payment. When set, it overrides `nextInDays`. */
  nextDate?: ISODate;
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
  /** Real deadline date. When set, it overrides `targetInDays`. */
  targetDate?: ISODate;
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

export type SavingsEntryKind = 'deposit' | 'withdrawal' | 'cycle';

/** One change to the current savings balance. `change` is signed: positive adds, negative reduces. */
export interface SavingsEntry {
  id: string;
  kind: SavingsEntryKind;
  change: Fils;
  /** The balance right after this change. */
  balanceAfter: Fils;
  date: ISODate;
  note: string;
}

/** The user's current savings pot. Goals earmark parts of it; they do not add to it. */
export interface SavingsAccount {
  balance: Fils;
  /** Newest first. */
  entries: readonly SavingsEntry[];
  /** The payday date of the last pay cycle whose result was added, so a cycle is only added once. */
  lastClosedCycle?: ISODate;
}

export interface Plan {
  savings: SavingsAccount;
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
/** The planning horizon never exceeds about two months, which keeps the charts readable. */
export const MAX_HORIZON_DAYS = 62;

/**
 * Days until the next salary; this is the planning horizon. Falls back to 30 with no salary.
 * When payday is TODAY the salary lands now and a new cycle begins, so the horizon is the length of one
 * pay cycle (not a single day, which would make today's salary look like one day of spending money).
 */
export function daysUntilPayday(plan: Plan): number {
  const salary = plan.income.find((i) => i.kind === 'salary');
  if (!salary) return DEFAULT_CYCLE_DAYS;
  const next = Math.max(0, Math.floor(salary.nextInDays));
  const horizon =
    next > 0
      ? next
      : salary.frequency === 'once'
        ? DEFAULT_CYCLE_DAYS
        : PERIOD_DAYS[salary.frequency];
  return Math.min(horizon, MAX_HORIZON_DAYS);
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

/**
 * Turn real dates into the relative days the maths uses, for a given `today`.
 *  - fixed bills with a due date: days until the next occurrence on or after today
 *  - income with a next date: days until the next payment
 *  - goals with a deadline date: days left (never negative)
 * Items without dates are returned unchanged, so relative-day sample data keeps working.
 */
export function resolvePlan(plan: Plan, today: ISODate): Plan {
  return {
    ...plan,
    expenses: plan.expenses.map((e) =>
      e.dueDate
        ? {
            ...e,
            nextDueInDays: daysBetween(today, nextOnOrAfter(e.dueDate, e.frequency, today)),
          }
        : e,
    ),
    income: plan.income.map((i) =>
      i.nextDate
        ? { ...i, nextInDays: daysBetween(today, nextOnOrAfter(i.nextDate, i.frequency, today)) }
        : i,
    ),
    goals: plan.goals.map((g) =>
      g.targetDate ? { ...g, targetInDays: Math.max(0, daysBetween(today, g.targetDate)) } : g,
    ),
  };
}
