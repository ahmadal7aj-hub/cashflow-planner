import {
  addMonthKeys,
  daysInMonthKey,
  formatMonthKey,
  monthEnd,
  monthOf,
  monthStart,
  monthsInRange,
} from './months';
import { itemOccurrences, occurrencesBetween } from './occurrences';
import { amountInMonth, isActiveIn, retire, startVersioned, withAmountChange } from './versioned';

describe('months', () => {
  it('converts between dates and month keys', () => {
    expect(monthOf('2026-10-03')).toBe('2026-10');
    expect(monthStart('2026-02')).toBe('2026-02-01');
    expect(monthEnd('2028-02')).toBe('2028-02-29');
    expect(daysInMonthKey('2026-04')).toBe(30);
    expect(addMonthKeys('2026-11', 3)).toBe('2027-02');
    expect(addMonthKeys('2026-01', -1)).toBe('2025-12');
    expect(formatMonthKey('2026-10')).toBe('October 2026');
  });

  it('lists every month in a range, including long ones', () => {
    expect(monthsInRange('2026-01-15', '2026-03-02')).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(monthsInRange('2026-05-01', '2026-04-01')).toEqual([]);
    expect(monthsInRange('2024-01-01', '2025-12-31')).toHaveLength(24);
  });
});

describe('versioned amounts', () => {
  const base = startVersioned({ id: 'a', amount: 3000 }, '2026-09');

  it('keeps old months at the old amount after an edit', () => {
    const edited = withAmountChange(base, 3500, '2026-11');
    expect(amountInMonth(edited, '2026-09')).toBe(3000);
    expect(amountInMonth(edited, '2026-10')).toBe(3000);
    expect(amountInMonth(edited, '2026-11')).toBe(3500);
    expect(edited.amount).toBe(3500);
  });

  it('replaces a same-month edit instead of stacking it', () => {
    const e = withAmountChange(withAmountChange(base, 3500, '2026-11'), 3600, '2026-11');
    expect(e.amountHistory).toEqual([
      { from: '2026-09', amount: 3000 },
      { from: '2026-11', amount: 3600 },
    ]);
  });

  it('is active from its start month until it is deleted', () => {
    const gone = retire(base, '2026-12');
    expect(isActiveIn(gone, '2026-08')).toBe(false);
    expect(isActiveIn(gone, '2026-09')).toBe(true);
    expect(isActiveIn(gone, '2026-11')).toBe(true);
    expect(isActiveIn(gone, '2026-12')).toBe(false);
  });

  it('treats items without history as always active at their current amount', () => {
    expect(isActiveIn({}, '1999-01')).toBe(true);
    expect(amountInMonth({ amount: 10 }, '2026-01')).toBe(10);
  });
});

describe('occurrences', () => {
  it('finds monthly dates inside a range, forwards and backwards from the anchor', () => {
    expect(occurrencesBetween('2026-10-25', 'monthly', '2026-08-01', '2026-10-31')).toEqual([
      '2026-08-25',
      '2026-09-25',
      '2026-10-25',
    ]);
  });

  it('clamps day 31 to short months and keeps coming back to 31', () => {
    expect(occurrencesBetween('2026-01-31', 'monthly', '2026-02-01', '2026-04-30')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('handles weekly, quarterly, yearly and one-off items', () => {
    expect(occurrencesBetween('2026-10-05', 'weekly', '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(occurrencesBetween('2026-12-15', 'quarterly', '2026-01-01', '2026-12-31')).toEqual([
      '2026-03-15',
      '2026-06-15',
      '2026-09-15',
      '2026-12-15',
    ]);
    expect(occurrencesBetween('2026-03-10', 'annual', '2024-01-01', '2027-12-31')).toEqual([
      '2024-03-10',
      '2025-03-10',
      '2026-03-10',
      '2027-03-10',
    ]);
    expect(occurrencesBetween('2026-10-03', 'once', '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-03',
    ]);
    expect(occurrencesBetween('2026-10-03', 'once', '2026-11-01', '2026-11-30')).toEqual([]);
  });

  it('returns nothing for a backwards range', () => {
    expect(occurrencesBetween('2026-10-03', 'monthly', '2026-11-01', '2026-10-01')).toEqual([]);
  });

  it('respects start, deletion and amount history', () => {
    const salary = withAmountChange(
      startVersioned({ amount: 15000, frequency: 'monthly' as const }, '2026-08'),
      16000,
      '2026-10',
    );
    const ended = retire(salary, '2026-11');
    const got = itemOccurrences(ended, '2026-08-25', '2026-06-01', '2026-12-31');
    expect(got).toEqual([
      { date: '2026-08-25', amount: 15000 },
      { date: '2026-09-25', amount: 15000 },
      { date: '2026-10-25', amount: 16000 },
    ]);
  });
});
