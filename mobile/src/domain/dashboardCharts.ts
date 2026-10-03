import type { Plan } from './budgetModel';
import { addDays, type ISODate } from './dates';
import type { DateRange } from './dashboardRange';
import type { Fils } from './money';
import { itemOccurrences } from './occurrences';
import {
  formatMonthKey,
  maxDate,
  minDate,
  monthEnd,
  monthStart,
  monthsInRange,
  type MonthKey,
} from './months';
import { periodSavings } from './savingsEngine';
import { allIncomeItems, incomeAnchor, sumAmounts, transactionsBetween } from './spending';

/**
 * Chart data for the dashboards. Pure: the range and today are passed in. Every figure is computed from the same
 * records and rules as the summary cards, only split by month or by source.
 */
export interface MonthBucket {
  month: MonthKey;
  label: string;
  /** The part of the month that lies inside the range. */
  from: ISODate;
  to: ISODate;
}

/** The most months a chart shows. Longer ranges show their last 12 months. */
export const MAX_BUCKETS = 12;

export function monthBuckets(range: DateRange, max: number = MAX_BUCKETS): MonthBucket[] {
  const all = monthsInRange(range.from, range.to).map((m) => ({
    month: m,
    label: formatMonthKey(m),
    from: maxDate(range.from, monthStart(m)),
    to: minDate(range.to, monthEnd(m)),
  }));
  return all.slice(Math.max(0, all.length - max));
}

/** Money received and still expected from one income item inside a range. */
export function incomeInRange(
  plan: Plan,
  itemId: string,
  range: DateRange,
  today: ISODate,
): { received: Fils; expected: Fils } {
  const item = allIncomeItems(plan).find((i) => i.id === itemId);
  if (!item) return { received: 0, expected: 0 };
  const anchor = incomeAnchor(item, today);
  const receivedTo = range.to < today ? range.to : today;
  const tomorrow = addDays(today, 1);
  return {
    received: sumAmounts(itemOccurrences(item, anchor, range.from, receivedTo)),
    expected: sumAmounts(
      itemOccurrences(item, anchor, range.from > tomorrow ? range.from : tomorrow, range.to),
    ),
  };
}

export interface SourceAmount {
  id: string;
  name: string;
  received: Fils;
  expected: Fils;
}

/** Income by source (salary, side work, ...) inside the range. Sources with nothing in the range are left out. */
export function incomeBySource(plan: Plan, range: DateRange, today: ISODate): SourceAmount[] {
  return allIncomeItems(plan)
    .map((i) => ({ id: i.id, name: i.name, ...incomeInRange(plan, i.id, range, today) }))
    .filter((s) => s.received > 0 || s.expected > 0)
    .sort(
      (a, b) => b.received + b.expected - (a.received + a.expected) || a.name.localeCompare(b.name),
    );
}

export interface MonthValue {
  month: MonthKey;
  label: string;
  value: Fils;
}

/** Income received in each month of the range (up to today). */
export function incomeByMonth(plan: Plan, range: DateRange, today: ISODate): MonthValue[] {
  return monthBuckets(range).map((b) => {
    let value = 0;
    for (const i of allIncomeItems(plan)) {
      const r = incomeInRange(plan, i.id, { from: b.from, to: b.to }, today);
      value += r.received;
    }
    return { month: b.month, label: b.label, value };
  });
}

/** Money spent (dated transactions) in each month of the range. */
export function spendingByMonth(plan: Plan, range: DateRange): MonthValue[] {
  return monthBuckets(range).map((b) => ({
    month: b.month,
    label: b.label,
    value: sumAmounts(transactionsBetween(plan, b.from, b.to)),
  }));
}

/** Net savings added in each month of the range (deposits minus withdrawals; the opening balance is excluded). */
export function savingsByMonth(plan: Plan, range: DateRange, today: ISODate): MonthValue[] {
  return monthBuckets(range).map((b) => ({
    month: b.month,
    label: b.label,
    value: periodSavings(plan.savings, b.from, b.to < today ? b.to : today),
  }));
}

/** How much of the range has passed, 0..1 (1 once it is over, 0 before it starts). Used for the budget pace marker. */
export function rangeElapsed(range: DateRange, today: ISODate): number {
  if (today < range.from) return 0;
  if (today >= range.to) return 1;
  const total = daysBetweenInclusive(range.from, range.to);
  return Math.min(1, daysBetweenInclusive(range.from, today) / total);
}

function daysBetweenInclusive(a: ISODate, b: ISODate): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}
