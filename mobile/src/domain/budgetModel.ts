import { daysBetween, nextOnOrAfter, type ISODate } from './dates';
import type { Fils } from './money';
import type { Commitment, ForecastInput } from './prototypeForecast';
import type { MonthKey } from './months';
import type { IncomeKind } from './uaeCategories';
import type { Versioned } from './versioned';

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

export interface ExpenseItem extends Versioned {
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

export interface IncomeItem extends Versioned {
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

/** One dated actual expense. Planned bills and budgets are NOT transactions; paying a bill creates one. */
export interface Transaction {
  id: string;
  date: ISODate;
  categoryId: string;
  /** Always more than zero. */
  amount: Fils;
  note: string;
  /** Set when this transaction is a planned bill marked as paid, so the bill is counted once. */
  billId?: string;
  /** The due date of the bill occurrence that was paid. */
  billDue?: ISODate;
}

export type SavingsMovementKind = 'deposit' | 'withdrawal' | 'month-close' | 'correction';

/** One dated change to the savings balance. `change` is signed: positive adds, negative reduces. */
export interface SavingsMovement {
  id: string;
  date: ISODate;
  kind: SavingsMovementKind;
  change: Fils;
  note: string;
  /** The month a month-close or a correction belongs to. */
  month?: MonthKey;
  /** Set when the owner shares this saving with a group. Sharing shows the same record elsewhere; it never changes balances. */
  share?: { groupId: string };
}

/** The frozen result of a finished month. Written once per month; later edits add corrections instead. */
export interface ClosedMonth {
  month: MonthKey;
  income: Fils;
  spending: Fils;
  /** Total monthly budget (the spending plan) for the month. */
  plan: Fils;
  target: Fils;
  /** income - spending. */
  result: Fils;
  /** Added to savings (never more than the target). */
  added: Fils;
  /** Taken from existing savings because spending went beyond income. */
  taken: Fils;
  /** added - taken, plus any corrections applied since. */
  net: Fils;
}

/**
 * Savings, kept as dated records. Balance = opening + every movement dated on or after the opening date.
 * The opening balance is neither income nor savings earned in any period.
 */
export interface SavingsLedger {
  opening: { amount: Fils; date: ISODate } | null;
  /** Monthly savings target, effective-dated; the last entry on or before a month applies to it. */
  targets: { from: MonthKey; amount: Fils }[];
  movements: SavingsMovement[];
  closed: ClosedMonth[];
}

export type InvestmentType =
  'stocks' | 'funds' | 'gold' | 'crypto' | 'real-estate' | 'fixed-income' | 'business' | 'other';

/**
 * Something the user has invested in. Tracking only: this is not investment advice and returns are
 * not guaranteed. Profit is `currentValue - invested`; income (dividends, rent, interest) is separate.
 */
export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  /** Total put in so far. */
  invested: Fils;
  /** What it is worth now, as entered by the user. */
  currentValue: Fils;
  /** Planned amount added each month; reserved in the forecast when enabled. */
  monthlyContribution: Fils;
  enabled: boolean;
  /** Income received per payment (dividend, rent, interest). 0 when none. */
  incomeAmount: Fils;
  incomeFrequency: Frequency;
}

export interface Plan {
  /** False until the new user has answered the savings questions. */
  setupDone: boolean;
  investments: readonly Investment[];
  savings: SavingsLedger;
  /** Optional spendable balance and safety buffer, used only by the safe-to-spend forecast. */
  availableCash: Fils;
  safetyBuffer: Fils;
  income: readonly IncomeItem[];
  /** Bills and fixed expenses (kind fixed) and everyday budgets (kind variable). */
  expenses: readonly ExpenseItem[];
  /** Deleted items, kept so earlier months can still be reported. Never shown as cards. */
  retiredIncome: readonly IncomeItem[];
  retiredExpenses: readonly ExpenseItem[];
  transactions: readonly Transaction[];
  goals: readonly SavingsGoal[];
  employment?: Employment;
}

export const EMPTY_LEDGER: SavingsLedger = {
  opening: null,
  targets: [],
  movements: [],
  closed: [],
};

/** A brand-new user: nothing entered, no sample amounts. */
export function emptyPlan(): Plan {
  return {
    setupDone: false,
    investments: [],
    savings: EMPTY_LEDGER,
    availableCash: 0,
    safetyBuffer: 0,
    income: [],
    expenses: [],
    retiredIncome: [],
    retiredExpenses: [],
    transactions: [],
    goals: [],
  };
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

  // Money set aside each cycle: the monthly savings target (goal contributions sit inside it, so the larger of
  // the two is used) plus planned investment contributions.
  const goalContributions = plan.goals
    .filter((g) => g.enabled)
    .reduce((sum, g) => sum + g.monthlyContribution, 0);
  const savingsReserve =
    Math.max(savingsTargetNow(plan), goalContributions) +
    plan.investments.filter((v) => v.enabled).reduce((sum, v) => sum + v.monthlyContribution, 0);

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

/** The monthly savings target that applies now (the newest effective-dated entry). */
function savingsTargetNow(plan: Plan): Fils {
  const last = plan.savings.targets[plan.savings.targets.length - 1];
  return last ? last.amount : 0;
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
