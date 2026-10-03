import type { Frequency } from './budgetModel';
import { addDays, addMonths, daysBetween, parseISO, type ISODate } from './dates';
import type { Fils } from './money';
import { monthOf } from './months';
import { amountInMonth, isActiveIn, type Versioned } from './versioned';

/**
 * Every date a repeating item falls on inside [from, to] (inclusive), stepping forwards and backwards from an
 * anchor date. Monthly, quarterly and yearly dates keep the anchor day of month, clamped to short months.
 * One-off items occur only on their anchor date.
 */
export function occurrencesBetween(
  anchor: ISODate,
  frequency: Frequency,
  from: ISODate,
  to: ISODate,
): ISODate[] {
  if (to < from) return [];
  if (frequency === 'once') return anchor >= from && anchor <= to ? [anchor] : [];
  const out: ISODate[] = [];
  if (frequency === 'weekly') {
    const first = Math.ceil(daysBetween(anchor, from) / 7);
    for (let k = first; ; k++) {
      const d = addDays(anchor, k * 7);
      if (d > to) break;
      out.push(d);
    }
    return out;
  }
  const step = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
  const a = parseISO(anchor);
  const f = parseISO(from);
  const t = parseISO(to);
  if (!a || !f || !t) throw new RangeError('Invalid date');
  const monthIndex = (p: { y: number; m: number }) => p.y * 12 + (p.m - 1);
  const kMin = Math.floor((monthIndex(f) - monthIndex(a)) / step) - 1;
  const kMax = Math.ceil((monthIndex(t) - monthIndex(a)) / step) + 1;
  for (let k = kMin; k <= kMax; k++) {
    const d = addMonths(anchor, k * step, a.d);
    if (d >= from && d <= to) out.push(d);
  }
  return out;
}

export interface DatedAmount {
  date: ISODate;
  amount: Fils;
}

/**
 * The dated occurrences of an item in a range, honouring when it started, when it was deleted, and what its
 * amount was in the month of each occurrence.
 */
export function itemOccurrences(
  item: Versioned & { amount: Fils; frequency: Frequency },
  anchor: ISODate,
  from: ISODate,
  to: ISODate,
): DatedAmount[] {
  return occurrencesBetween(anchor, item.frequency, from, to)
    .filter((d) => isActiveIn(item, monthOf(d)))
    .map((d) => ({ date: d, amount: amountInMonth(item, monthOf(d)) }));
}
