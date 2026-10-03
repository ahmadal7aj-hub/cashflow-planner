import type { DateRange } from './dashboardRange';
import { toISO, type ISODate } from './dates';

/**
 * What the Shared Savings dashboard shows for a chosen range. Pure. The totals themselves come from the database
 * (one source of truth, so every member sees the same numbers); this only picks the history to display.
 */

/** The calendar day (in the viewer's own time zone) of a timestamp such as `2026-10-05T14:30:00+00:00`. */
export function localDay(timestamp: string): ISODate {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp.slice(0, 10);
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function inRange(day: ISODate, range: DateRange): boolean {
  return day >= range.from && day <= range.to;
}

/** Entries are placed by the date of the saving itself, so history and totals use the same dates. */
export function entriesInRange<T extends { entryDate: ISODate }>(
  entries: readonly T[],
  range: DateRange,
): T[] {
  return entries.filter((e) => inRange(e.entryDate, range));
}

/** Group events are placed by the day they happened, in the viewer's time zone. */
export function eventsInRange<T extends { occurredAt: string }>(
  events: readonly T[],
  range: DateRange,
): T[] {
  return events.filter((e) => inRange(localDay(e.occurredAt), range));
}

/**
 * The dates the totals are asked for. The cumulative balance is as of the end of the range, but never later than
 * today (a saving cannot be dated in the future). `future` is true when the whole range is still to come.
 */
export function totalsWindow(
  range: DateRange,
  today: ISODate,
): { from: ISODate; to: ISODate; future: boolean } {
  const to = range.to < today ? range.to : today;
  if (range.from > to) return { from: to, to, future: true };
  return { from: range.from, to, future: false };
}
