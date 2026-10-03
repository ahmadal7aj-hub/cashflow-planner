import type { ISODate } from './dates';
import { formatDate, parseISO } from './dates';
import type { Reminder } from './reminders';

/**
 * Phone notifications for bill reminders. Pure: what to schedule, from the reminders and the current time.
 * The text never contains an amount, so nothing about money shows on a locked screen.
 */
export const NOTIFY_HOUR = 9;
/** Phones allow only a limited number of scheduled notifications (iPhone: 64). */
export const MAX_SCHEDULED = 50;

export interface ScheduledReminder {
  id: string;
  title: string;
  body: string;
  /** Local time the notification should appear. */
  at: Date;
}

export function localNine(date: ISODate): Date | null {
  const p = parseISO(date);
  return p ? new Date(p.y, p.m - 1, p.d, NOTIFY_HOUR, 0, 0, 0) : null;
}

export function bodyFor(name: string, daysBefore: number, dueDate: ISODate): string {
  if (daysBefore <= 0) return `${name} is due today.`;
  if (daysBefore === 1) return `${name} is due tomorrow (${formatDate(dueDate)}).`;
  return `${name} is due in ${daysBefore} days (${formatDate(dueDate)}).`;
}

/** One notification at 9:00 on each reminder's date, for those still in the future, soonest first. */
export function notificationSchedule(
  reminders: readonly Reminder[],
  now: Date,
): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  for (const r of reminders) {
    const at = localNine(r.reminderDate);
    if (!at || at.getTime() <= now.getTime()) continue;
    out.push({
      id: `${r.id}:${r.dueDate}`,
      title: 'Bill due soon',
      body: bodyFor(r.name, r.daysBefore, r.dueDate),
      at,
    });
  }
  out.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
  return out.slice(0, MAX_SCHEDULED);
}
