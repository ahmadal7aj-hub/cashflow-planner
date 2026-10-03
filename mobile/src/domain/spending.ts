import type { ExpenseItem, IncomeItem, Plan, Transaction } from './budgetModel';
import { addDays, daysBetween, type ISODate } from './dates';
import type { Fils } from './money';
import { itemOccurrences } from './occurrences';
import { daysInMonthKey, maxDate, minDate, monthEnd, monthsInRange, monthStart } from './months';
import { getExpenseCategory } from './uaeCategories';
import { amountInMonth, isActiveIn } from './versioned';

/**
 * Budget versus actual spending. Pure; integer fils.
 *
 * - A budget is a monthly amount per category (everyday budgets) or a bill that falls due on dates (bills).
 * - Actual spending is the sum of dated transactions. A planned bill is never an actual transaction until it is
 *   marked as paid, so nothing is counted twice.
 * - For a whole month the budget is exact. For any other range, everyday budgets are prorated by days and bills
 *   count when they fall due inside the range.
 */

/** Where a repeating item starts, from its real date or (for relative sample data) its days from today. */
export function incomeAnchor(i: IncomeItem, today: ISODate): ISODate {
  return i.nextDate ?? addDays(today, i.nextInDays);
}

export function billAnchor(e: ExpenseItem, today: ISODate): ISODate {
  return e.dueDate ?? addDays(today, e.nextDueInDays);
}

export function allExpenseItems(plan: Plan): ExpenseItem[] {
  return [...plan.expenses, ...plan.retiredExpenses];
}

export function allIncomeItems(plan: Plan): IncomeItem[] {
  return [...plan.income, ...plan.retiredIncome];
}

export function transactionsBetween(plan: Plan, from: ISODate, to: ISODate): Transaction[] {
  return plan.transactions.filter((t) => t.date >= from && t.date <= to);
}

export function sumAmounts(list: readonly { amount: Fils }[]): Fils {
  return list.reduce((s, x) => s + x.amount, 0);
}

/** Budget per category over [from, to]. Categories with no budget are absent from the map. */
export function budgetByCategory(
  plan: Plan,
  from: ISODate,
  to: ISODate,
  today: ISODate,
): Map<string, Fils> {
  const out = new Map<string, Fils>();
  const add = (id: string, amount: Fils) => out.set(id, (out.get(id) ?? 0) + amount);
  if (to < from) return out;
  for (const e of allExpenseItems(plan)) {
    if (e.kind === 'variable') {
      for (const m of monthsInRange(from, to)) {
        if (!isActiveIn(e, m)) continue;
        const start = maxDate(from, monthStart(m));
        const end = minDate(to, monthEnd(m));
        const overlap = daysBetween(start, end) + 1;
        add(e.categoryId, Math.round((amountInMonth(e, m) * overlap) / daysInMonthKey(m)));
      }
    } else {
      for (const o of itemOccurrences(e, billAnchor(e, today), from, to))
        add(e.categoryId, o.amount);
    }
  }
  return out;
}

export interface CategoryRow {
  categoryId: string;
  label: string;
  budget: Fils;
  actual: Fils;
  /** budget - actual. Negative means overspent. */
  remaining: Fils;
  over: boolean;
  /** Spending in a category that has no budget in this period. Shown, never hidden. */
  unbudgeted: boolean;
}

export interface SpendingReport {
  rows: CategoryRow[];
  totalBudget: Fils;
  totalActual: Fils;
  /** totalBudget - totalActual (negative means the overall plan is exceeded). */
  totalRemaining: Fils;
  unbudgetedActual: Fils;
}

export function spendingReport(
  plan: Plan,
  from: ISODate,
  to: ISODate,
  today: ISODate,
): SpendingReport {
  const budgets = budgetByCategory(plan, from, to, today);
  const actuals = new Map<string, Fils>();
  for (const t of transactionsBetween(plan, from, to)) {
    actuals.set(t.categoryId, (actuals.get(t.categoryId) ?? 0) + t.amount);
  }
  const ids = new Set<string>([...budgets.keys(), ...actuals.keys()]);
  const rows: CategoryRow[] = [...ids].map((id) => {
    const budget = budgets.get(id) ?? 0;
    const actual = actuals.get(id) ?? 0;
    return {
      categoryId: id,
      label: getExpenseCategory(id).label,
      budget,
      actual,
      remaining: budget - actual,
      over: actual > budget,
      unbudgeted: !budgets.has(id),
    };
  });
  rows.sort(
    (a, b) =>
      Number(a.unbudgeted) - Number(b.unbudgeted) ||
      a.remaining - b.remaining ||
      a.label.localeCompare(b.label),
  );
  const totalBudget = sumAmounts(rows.map((r) => ({ amount: r.budget })));
  const totalActual = sumAmounts(rows.map((r) => ({ amount: r.actual })));
  return {
    rows,
    totalBudget,
    totalActual,
    totalRemaining: totalBudget - totalActual,
    unbudgetedActual: rows.filter((r) => r.unbudgeted).reduce((s, r) => s + r.actual, 0),
  };
}

/** True when this occurrence of a bill has already been marked as paid. */
export function isBillPaid(plan: Plan, billId: string, due: ISODate): boolean {
  return plan.transactions.some((t) => t.billId === billId && t.billDue === due);
}
