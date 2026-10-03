import type { Plan } from './budgetModel';
import { addDays, isValidISO, parseISO, toISO, weekdayMondayFirst, type ISODate } from './dates';
import type { Fils } from './money';
import { itemOccurrences } from './occurrences';
import { monthEnd, monthOf, monthStart } from './months';
import { balanceAsOf, periodSavings, projectMonth, type MonthProjection } from './savingsEngine';
import {
  allIncomeItems,
  incomeAnchor,
  spendingReport,
  sumAmounts,
  type SpendingReport,
} from './spending';

/**
 * Dashboard date ranges. Pure: "today" is passed in (taken from the device clock in the user's own time zone).
 * Both ends of a range are included. Filtering changes only what is shown, never the records.
 */
export type RangePreset =
  'current-month' | 'last-week' | 'last-month' | 'last-quarter' | 'last-year' | 'custom';

export const RANGE_PRESETS: readonly RangePreset[] = [
  'current-month',
  'last-week',
  'last-month',
  'last-quarter',
  'last-year',
  'custom',
];

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/**
 * - current-month: the 1st to the last day of this calendar month
 * - last-week: the previous full week, Monday to Sunday
 * - last-month / last-quarter / last-year: the previous full calendar month / quarter (Jan-Mar, ...) / year
 */
export function presetRange(preset: Exclude<RangePreset, 'custom'>, today: ISODate): DateRange {
  const t = parseISO(today);
  if (!t) throw new RangeError(`Invalid date: ${today}`);
  switch (preset) {
    case 'current-month':
      return { from: monthStart(monthOf(today)), to: monthEnd(monthOf(today)) };
    case 'last-week': {
      const thisMonday = addDays(today, -weekdayMondayFirst(today));
      const from = addDays(thisMonday, -7);
      return { from, to: addDays(from, 6) };
    }
    case 'last-month': {
      const y = t.m === 1 ? t.y - 1 : t.y;
      const m = t.m === 1 ? 12 : t.m - 1;
      return {
        from: toISO(y, m, 1),
        to: monthEnd(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`),
      };
    }
    case 'last-quarter': {
      const q = Math.floor((t.m - 1) / 3);
      const y = q === 0 ? t.y - 1 : t.y;
      const startMonth = (q === 0 ? 3 : q - 1) * 3 + 1;
      const endKey = `${String(y).padStart(4, '0')}-${String(startMonth + 2).padStart(2, '0')}`;
      return { from: toISO(y, startMonth, 1), to: monthEnd(endKey) };
    }
    case 'last-year':
      return { from: toISO(t.y - 1, 1, 1), to: toISO(t.y - 1, 12, 31) };
  }
}

/** True when the range starts on the 1st and ends on the last day of a month, so budgets apply in full. */
export function coversWholeMonths(range: DateRange): boolean {
  return range.from === monthStart(monthOf(range.from)) && range.to === monthEnd(monthOf(range.to));
}

export type RangeError = 'invalid-start' | 'invalid-end' | 'order';

/** A custom range may be any valid start and end, for example ten days, two years or all of January 2026. */
export function validateRange(from: string, to: string): RangeError | null {
  if (!isValidISO(from)) return 'invalid-start';
  if (!isValidISO(to)) return 'invalid-end';
  if (to < from) return 'order';
  return null;
}

export interface DashboardSummary extends DateRange {
  income: { received: Fils; expected: Fils };
  spending: SpendingReport;
  savings: {
    /** Net savings added during the range, including reductions. Excludes the opening balance. */
    period: Fils;
    /** Cumulative balance at the end of the range (or today, if the range is still running). */
    total: Fils | null;
    totalAsOf: ISODate;
    /** Present when the range includes today: an estimate for the current month, labelled projected. */
    projection: MonthProjection | null;
  };
}

export function summarize(plan: Plan, range: DateRange, today: ISODate): DashboardSummary {
  const { from, to } = range;
  let received = 0;
  let expected = 0;
  for (const i of allIncomeItems(plan)) {
    const anchor = incomeAnchor(i, today);
    received += sumAmounts(itemOccurrences(i, anchor, from, to < today ? to : today));
    const afterToday = addDays(today, 1);
    expected += sumAmounts(itemOccurrences(i, anchor, from > afterToday ? from : afterToday, to));
  }
  const totalAsOf = to < today ? to : today;
  const includesToday = from <= today && today <= to;
  return {
    from,
    to,
    income: { received, expected },
    spending: spendingReport(plan, from, to, today),
    savings: {
      period: periodSavings(plan.savings, from, to < today ? to : today),
      total: balanceAsOf(plan.savings, totalAsOf),
      totalAsOf,
      projection: includesToday ? projectMonth(plan, monthOf(today), today) : null,
    },
  };
}
