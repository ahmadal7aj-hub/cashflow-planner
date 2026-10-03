import type { ClosedMonth, Plan, SavingsLedger, SavingsMovement } from './budgetModel';
import type { ISODate } from './dates';
import type { Fils } from './money';
import { itemOccurrences } from './occurrences';
import {
  addMonthKeys,
  maxDate,
  minDate,
  monthEnd,
  monthOf,
  monthStart,
  type MonthKey,
} from './months';
import {
  allIncomeItems,
  budgetByCategory,
  incomeAnchor,
  sumAmounts,
  transactionsBetween,
} from './spending';

/**
 * Savings, kept strictly separate from income and spending.
 *
 *   existing balance  = opening + every movement dated on or after the opening date
 *   monthly target    = what the user plans to save (a plan, not money already saved)
 *   projected savings = an estimate for an unfinished month, always labelled projected
 *   actual movements  = deposits, withdrawals, month-end results and corrections
 *
 * Month result R = income received - actual spending. At month end, savings change by
 *   added = max(0, min(R, target))   and   taken = max(0, -R)
 * so overspending first eats the planned saving and only then existing savings. Underspending in one category
 * offsets overspending in another because only the overall totals matter. Transfers to or from savings are never
 * counted as income or spending.
 */

export function targetInMonth(ledger: SavingsLedger, month: MonthKey): Fils {
  let found: Fils = 0;
  for (const t of ledger.targets) if (t.from <= month) found = t.amount;
  return found;
}

/** Savings balance at the end of `date`, or null when it is unknown (no opening balance, or before it). */
export function balanceAsOf(ledger: SavingsLedger, date: ISODate): Fils | null {
  const o = ledger.opening;
  if (!o || date < o.date) return null;
  return (
    o.amount +
    ledger.movements
      .filter((m) => m.date >= o.date && m.date <= date)
      .reduce((s, m) => s + m.change, 0)
  );
}

/** Net savings change from movements dated inside [from, to], inclusive. Excludes the opening balance. */
export function periodSavings(ledger: SavingsLedger, from: ISODate, to: ISODate): Fils {
  const o = ledger.opening;
  const start = o ? maxDate(from, o.date) : from;
  return ledger.movements
    .filter((m) => m.date >= start && m.date <= to)
    .reduce((s, m) => s + m.change, 0);
}

export interface MonthFigures {
  month: MonthKey;
  income: Fils;
  spending: Fils;
  plan: Fils;
  target: Fils;
  result: Fils;
  added: Fils;
  taken: Fils;
  net: Fils;
}

export function applyTarget(result: Fils, target: Fils): { added: Fils; taken: Fils; net: Fils } {
  const added = Math.max(0, Math.min(result, target));
  const taken = Math.max(0, -result);
  return { added, taken, net: added - taken };
}

function incomeBetween(plan: Plan, from: ISODate, to: ISODate, today: ISODate): Fils {
  if (to < from) return 0;
  let sum = 0;
  for (const i of allIncomeItems(plan)) {
    sum += sumAmounts(itemOccurrences(i, incomeAnchor(i, today), from, to));
  }
  return sum;
}

function monthBounds(plan: Plan, month: MonthKey): { from: ISODate; to: ISODate } {
  const o = plan.savings.opening;
  return { from: o ? maxDate(monthStart(month), o.date) : monthStart(month), to: monthEnd(month) };
}

/** Figures for a finished month, using only income dated up to `today`. */
export function monthFigures(plan: Plan, month: MonthKey, today: ISODate): MonthFigures {
  const { from, to } = monthBounds(plan, month);
  const income = incomeBetween(plan, from, minDate(to, today), today);
  const spending = sumAmounts(transactionsBetween(plan, from, to));
  const planned = sumAmounts(
    [...budgetByCategory(plan, monthStart(month), to, today).values()].map((amount) => ({
      amount,
    })),
  );
  const target = targetInMonth(plan.savings, month);
  const result = income - spending;
  return { month, income, spending, plan: planned, target, result, ...applyTarget(result, target) };
}

export interface MonthProjection extends MonthFigures {
  /** Spending so far this month. */
  spentSoFar: Fils;
  /** The balance today plus the projected change by month end, or null if the balance is unknown. */
  projectedClosing: Fils | null;
}

/**
 * Estimate for an unfinished month: all of the month's scheduled income, and spending of whichever is larger,
 * the plan or what has already been spent. Always shown as "projected".
 */
export function projectMonth(plan: Plan, month: MonthKey, today: ISODate): MonthProjection {
  const { from, to } = monthBounds(plan, month);
  const income = incomeBetween(plan, from, to, today);
  const spentSoFar = sumAmounts(transactionsBetween(plan, from, to));
  const planned = sumAmounts(
    [...budgetByCategory(plan, monthStart(month), to, today).values()].map((amount) => ({
      amount,
    })),
  );
  const spending = Math.max(planned, spentSoFar);
  const target = targetInMonth(plan.savings, month);
  const result = income - spending;
  const applied = applyTarget(result, target);
  const now = balanceAsOf(plan.savings, today);
  return {
    month,
    income,
    spending,
    plan: planned,
    target,
    result,
    ...applied,
    spentSoFar,
    projectedClosing: now === null ? null : now + applied.net,
  };
}

function closedFrom(f: MonthFigures): ClosedMonth {
  return {
    month: f.month,
    income: f.income,
    spending: f.spending,
    plan: f.plan,
    target: f.target,
    result: f.result,
    added: f.added,
    taken: f.taken,
    net: f.net,
  };
}

/**
 * Close every finished month that has not been closed yet, once each. Safe to run any number of times: a month
 * that is already closed is never added again.
 */
export function closeMonths(plan: Plan, today: ISODate): Plan {
  const o = plan.savings.opening;
  if (!o) return plan;
  const current = monthOf(today);
  const done = new Set(plan.savings.closed.map((c) => c.month));
  const closed: ClosedMonth[] = [...plan.savings.closed];
  const movements: SavingsMovement[] = [...plan.savings.movements];
  let changed = false;
  for (let m = monthOf(o.date); m < current; m = addMonthKeys(m, 1)) {
    if (done.has(m)) continue;
    const f = monthFigures(plan, m, today);
    closed.push(closedFrom(f));
    if (f.net !== 0) {
      movements.push({
        id: `close-${m}`,
        date: monthEnd(m),
        kind: 'month-close',
        change: f.net,
        note: '',
        month: m,
      });
    }
    changed = true;
  }
  if (!changed) return plan;
  closed.sort((a, b) => a.month.localeCompare(b.month));
  return { ...plan, savings: { ...plan.savings, closed, movements } };
}

/**
 * If records in an already-closed month changed (for example a back-dated expense), add a dated correction in the
 * present instead of rewriting the closed month.
 */
export function reconcileClosed(plan: Plan, today: ISODate): Plan {
  let movements = plan.savings.movements;
  let changed = false;
  const closed = plan.savings.closed.map((c) => {
    const f = monthFigures(plan, c.month, today);
    if (f.net === c.net) return c;
    const n = movements.filter((m) => m.kind === 'correction' && m.month === c.month).length + 1;
    movements = [
      ...movements,
      {
        id: `correction-${c.month}-${n}`,
        date: today,
        kind: 'correction',
        change: f.net - c.net,
        note: '',
        month: c.month,
      },
    ];
    changed = true;
    return { ...c, net: f.net };
  });
  return changed ? { ...plan, savings: { ...plan.savings, closed, movements } } : plan;
}

/** Bring the savings records up to date: close finished months, then reconcile changes to closed ones. */
export function maintainSavings(plan: Plan, today: ISODate): Plan {
  return reconcileClosed(closeMonths(plan, today), today);
}
