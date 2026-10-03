import { daysInMonth, formatMonthYear, parseISO, toISO, type ISODate } from './dates';

/** A calendar month as `YYYY-MM`. Pure helpers; no clock and no time zone (dates are plain ISO strings). */
export type MonthKey = string;

export function monthOf(iso: ISODate): MonthKey {
  const p = parseISO(iso);
  if (!p) throw new RangeError(`Invalid date: ${iso}`);
  return `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}`;
}

function parseMonth(m: MonthKey): { y: number; m: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) throw new RangeError(`Invalid month: ${m}`);
  return { y: Number(match[1]), m: Number(match[2]) };
}

export function monthStart(m: MonthKey): ISODate {
  const p = parseMonth(m);
  return toISO(p.y, p.m, 1);
}

export function monthEnd(m: MonthKey): ISODate {
  const p = parseMonth(m);
  return toISO(p.y, p.m, daysInMonth(p.y, p.m));
}

export function daysInMonthKey(m: MonthKey): number {
  const p = parseMonth(m);
  return daysInMonth(p.y, p.m);
}

export function addMonthKeys(m: MonthKey, n: number): MonthKey {
  const p = parseMonth(m);
  const total = p.y * 12 + (p.m - 1) + n;
  const y = String(Math.floor(total / 12)).padStart(4, '0');
  const mm = String((total % 12) + 1).padStart(2, '0');
  return `${y}-${mm}`;
}

/** Every month from the month of `from` to the month of `to`, inclusive. Empty when `to` is before `from`. */
export function monthsInRange(from: ISODate, to: ISODate): MonthKey[] {
  const out: MonthKey[] = [];
  let m = monthOf(from);
  const last = monthOf(to);
  for (let i = 0; i < 12_000 && m <= last; i++) {
    out.push(m);
    m = addMonthKeys(m, 1);
  }
  return out;
}

/** `October 2026` */
export function formatMonthKey(m: MonthKey): string {
  const p = parseMonth(m);
  return formatMonthYear(p.y, p.m);
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}
