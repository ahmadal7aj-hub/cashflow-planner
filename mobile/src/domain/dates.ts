/**
 * Pure calendar-date helpers (prototype). Dates are ISO strings `YYYY-MM-DD` with no time zone, so
 * "15 Dec 2026" means the same thing everywhere. The only impure function is `todayISO`, used at the
 * app's edge; everything else takes "today" as an argument so it is deterministic and testable.
 */
export type ISODate = string;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_MS = 24 * 60 * 60 * 1000;

export interface YMD {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** Parse `YYYY-MM-DD`; returns null for anything that is not a real calendar date. */
export function parseISO(s: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return { y, m: mo, d };
}

export function isValidISO(s: string): boolean {
  return parseISO(s) !== null;
}

export function toISO(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toUTC(iso: ISODate): number {
  const p = parseISO(iso);
  if (!p) throw new RangeError(`Invalid date: ${iso}`);
  return Date.UTC(p.y, p.m - 1, p.d);
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = new Date(toUTC(iso) + n * DAY_MS);
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Add calendar months, keeping the day of month where possible (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: ISODate, n: number, anchorDay?: number): ISODate {
  const p = parseISO(iso);
  if (!p) throw new RangeError(`Invalid date: ${iso}`);
  const total = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const day = Math.min(anchorDay ?? p.d, daysInMonth(y, m));
  return toISO(y, m, day);
}

export type RepeatFrequency = 'once' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

/**
 * The first occurrence of a repeating date that falls on or after `today`.
 * One-off dates are returned unchanged (they may be in the past). Monthly, quarterly and yearly dates keep
 * their day of month, clamped to short months.
 */
export function nextOnOrAfter(start: ISODate, frequency: RepeatFrequency, today: ISODate): ISODate {
  if (frequency === 'once' || daysBetween(today, start) >= 0) return start;
  if (frequency === 'weekly') {
    const behind = daysBetween(start, today);
    return addDays(start, Math.ceil(behind / 7) * 7);
  }
  const step = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
  const p = parseISO(start);
  if (!p) throw new RangeError(`Invalid date: ${start}`);
  let months = 0;
  // Bounded loop: at most a few thousand months of catch-up for any realistic input.
  for (let i = 0; i < 5000; i++) {
    months += step;
    const candidate = addMonths(start, months, p.d);
    if (daysBetween(today, candidate) >= 0) return candidate;
  }
  return start;
}

/** `15 Dec 2026` */
export function formatDate(iso: ISODate): string {
  const p = parseISO(iso);
  if (!p) return iso;
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** `December 2026` */
export function formatMonthYear(y: number, m: number): string {
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Day of week with Monday = 0 ... Sunday = 6 (the UAE week starts on Monday). */
export function weekdayMondayFirst(iso: ISODate): number {
  const p = parseISO(iso);
  if (!p) throw new RangeError(`Invalid date: ${iso}`);
  const sundayFirst = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** "in 73 days", "tomorrow", "today", "3 days ago" */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** The only impure function: today's date from the device clock. Call it at the edge of the app. */
export function todayISO(): ISODate {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
