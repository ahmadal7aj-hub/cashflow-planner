import type { Plan } from './budgetModel';
import { addDays, daysBetween, nextOnOrAfter, type ISODate } from './dates';
import type { Fils } from './money';

/** Pure reminder logic (prototype). In-app only; phone notifications are a later step. */

export interface Reminder {
  id: string;
  name: string;
  amount: Fils;
  /** The next due date on or after today. */
  dueDate: ISODate;
  /** The day the reminder starts showing. */
  reminderDate: ISODate;
  daysBefore: number;
  daysUntilDue: number;
  /** True from the reminder date up to and including the due date. */
  active: boolean;
}

/** Reminders for fixed bills that have one set, soonest due date first. Past one-off bills are dropped. */
export function remindersFor(plan: Plan, today: ISODate): Reminder[] {
  const out: Reminder[] = [];
  for (const e of plan.expenses) {
    if (e.kind !== 'fixed' || e.reminderDaysBefore === undefined) continue;
    // Items without a real date fall back to their relative "due in N days".
    const start = e.dueDate ?? addDays(today, e.nextDueInDays);
    const dueDate = nextOnOrAfter(start, e.frequency, today);
    const daysUntilDue = daysBetween(today, dueDate);
    if (daysUntilDue < 0) continue;
    const reminderDate = addDays(dueDate, -e.reminderDaysBefore);
    out.push({
      id: e.id,
      name: e.name,
      amount: e.amount,
      dueDate,
      reminderDate,
      daysBefore: e.reminderDaysBefore,
      daysUntilDue,
      active: daysBetween(reminderDate, today) >= 0,
    });
  }
  return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.name.localeCompare(b.name));
}

export function activeReminders(plan: Plan, today: ISODate): Reminder[] {
  return remindersFor(plan, today).filter((r) => r.active);
}

/** Presets offered in the reminder picker, in days before the due date. */
export const REMINDER_PRESETS: readonly { daysBefore: number; label: string }[] = [
  { daysBefore: 0, label: 'On the day' },
  { daysBefore: 1, label: '1 day before' },
  { daysBefore: 3, label: '3 days before' },
  { daysBefore: 7, label: '1 week before' },
  { daysBefore: 14, label: '2 weeks before' },
];

/** The largest offset a reminder can have. */
export const MAX_REMINDER_DAYS = 60;
