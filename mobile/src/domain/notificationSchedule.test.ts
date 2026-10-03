import type { Reminder } from './reminders';
import { MAX_SCHEDULED, bodyFor, notificationSchedule } from './notificationSchedule';

const r = (over: Partial<Reminder>): Reminder => ({
  id: 'rent',
  name: 'Rent',
  amount: 450000,
  dueDate: '2026-10-25',
  reminderDate: '2026-10-22',
  daysBefore: 3,
  daysUntilDue: 10,
  active: false,
  ...over,
});

describe('which phone notifications to schedule', () => {
  const now = new Date(2026, 9, 15, 12, 0, 0); // 15 Oct 2026, noon

  it('schedules 9:00 on the reminder date, with no amount in the text', () => {
    const [n] = notificationSchedule([r({})], now);
    expect(n!.at).toEqual(new Date(2026, 9, 22, 9, 0, 0));
    expect(n!.title).toBe('Bill due soon');
    expect(n!.body).toBe('Rent is due in 3 days (25 Oct 2026).');
    expect(n!.body).not.toMatch(/4,?500|AED/);
  });

  it('skips reminders whose time has already passed, including 9:00 today when it is already noon', () => {
    const today = r({ id: 'a', reminderDate: '2026-10-15', daysBefore: 0, dueDate: '2026-10-15' });
    const past = r({ id: 'b', reminderDate: '2026-10-10' });
    expect(notificationSchedule([today, past], now)).toEqual([]);
    expect(notificationSchedule([today], new Date(2026, 9, 15, 7, 0, 0))).toHaveLength(1);
  });

  it('words today, tomorrow and several days differently', () => {
    expect(bodyFor('Rent', 0, '2026-10-25')).toBe('Rent is due today.');
    expect(bodyFor('Rent', 1, '2026-10-25')).toBe('Rent is due tomorrow (25 Oct 2026).');
    expect(bodyFor('Rent', 7, '2026-10-25')).toBe('Rent is due in 7 days (25 Oct 2026).');
  });

  it('orders by time and never schedules more than the phone allows', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      r({
        id: `b${i}`,
        reminderDate: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
        dueDate: '2026-12-01',
      }),
    );
    const out = notificationSchedule(many, now);
    expect(out).toHaveLength(MAX_SCHEDULED);
    expect(out.map((x) => x.at.getTime())).toEqual(
      [...out.map((x) => x.at.getTime())].sort((a, b) => a - b),
    );
  });
});
