import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  formatDate,
  formatMonthYear,
  isLeapYear,
  isValidISO,
  nextOnOrAfter,
  parseISO,
  relativeDays,
  toISO,
  weekdayMondayFirst,
} from './dates';

describe('calendar basics', () => {
  it.each([
    [2024, true],
    [2025, false],
    [2000, true],
    [1900, false],
    [2026, false],
  ])('isLeapYear(%p) is %p', (y, expected) => {
    expect(isLeapYear(y)).toBe(expected);
  });

  it('knows month lengths, including February in leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it.each(['2026-12-15', '2028-02-29', '2026-01-01'])('accepts %s', (s) => {
    expect(isValidISO(s)).toBe(true);
  });

  it.each([
    '2026-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-04-31',
    '15/12/2026',
    '2026-1-5',
    '',
    'abc',
  ])('rejects %p', (s) => {
    expect(isValidISO(s)).toBe(false);
  });

  it('parses and rebuilds a date', () => {
    expect(parseISO('2026-12-15')).toEqual({ y: 2026, m: 12, d: 15 });
    expect(toISO(2026, 3, 7)).toBe('2026-03-07');
  });
});

describe('daysBetween and addDays', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween('2026-10-03', '2026-12-15')).toBe(73);
    expect(daysBetween('2026-12-15', '2026-10-03')).toBe(-73);
    expect(daysBetween('2026-10-03', '2026-10-03')).toBe(0);
  });

  it('is not thrown off by month ends, leap days or year ends', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('is unaffected by daylight-saving shifts elsewhere (calendar arithmetic only)', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('adds and subtracts days across boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDays('2026-10-03', 0)).toBe('2026-10-03');
  });

  it('throws on an invalid date instead of returning nonsense', () => {
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow(RangeError);
  });
});

describe('addMonths', () => {
  it('keeps the day of month', () => {
    expect(addMonths('2026-10-15', 2)).toBe('2026-12-15');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });

  it('clamps to the end of short months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('can restore the anchor day after a clamped month', () => {
    expect(addMonths('2026-02-28', 1, 31)).toBe('2026-03-31');
  });

  it('goes backwards', () => {
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
  });
});

describe('nextOnOrAfter', () => {
  const today = '2026-10-03';

  it('returns a future date unchanged', () => {
    expect(nextOnOrAfter('2026-12-15', 'monthly', today)).toBe('2026-12-15');
    expect(nextOnOrAfter(today, 'monthly', today)).toBe(today);
  });

  it('returns a one-off date unchanged even if it is in the past', () => {
    expect(nextOnOrAfter('2026-01-10', 'once', today)).toBe('2026-01-10');
  });

  it('rolls a monthly bill forward by calendar months, keeping the day', () => {
    expect(nextOnOrAfter('2026-06-15', 'monthly', today)).toBe('2026-10-15');
    expect(nextOnOrAfter('2026-06-01', 'monthly', today)).toBe('2026-11-01');
  });

  it('keeps the original day across short months', () => {
    expect(nextOnOrAfter('2026-01-31', 'monthly', '2026-02-10')).toBe('2026-02-28');
    expect(nextOnOrAfter('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31');
  });

  it('rolls weekly, quarterly and yearly dates', () => {
    expect(nextOnOrAfter('2026-09-01', 'weekly', today)).toBe('2026-10-06');
    expect(nextOnOrAfter('2026-01-10', 'quarterly', today)).toBe('2026-10-10');
    expect(nextOnOrAfter('2024-12-15', 'annual', today)).toBe('2026-12-15');
  });

  it('catches up from a very old date to the correct next occurrence', () => {
    // The 1st of each month: 1 Oct 2026 is already past on 3 Oct, so the next one is 1 Nov 2026.
    expect(nextOnOrAfter('1900-01-01', 'monthly', today)).toBe('2026-11-01');
    expect(nextOnOrAfter('1900-06-15', 'annual', today)).toBe('2027-06-15');
  });
});

describe('formatting', () => {
  it('formats dates the way people write them', () => {
    expect(formatDate('2026-12-15')).toBe('15 Dec 2026');
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026');
    expect(formatMonthYear(2026, 12)).toBe('December 2026');
  });

  it('describes distance in plain words', () => {
    expect(relativeDays(0)).toBe('today');
    expect(relativeDays(1)).toBe('tomorrow');
    expect(relativeDays(73)).toBe('in 73 days');
    expect(relativeDays(-1)).toBe('yesterday');
    expect(relativeDays(-5)).toBe('5 days ago');
  });

  it('puts Monday first (the UAE week)', () => {
    expect(weekdayMondayFirst('2026-10-05')).toBe(0); // Monday
    expect(weekdayMondayFirst('2026-10-11')).toBe(6); // Sunday
    expect(weekdayMondayFirst('2026-10-03')).toBe(5); // Saturday
  });
});
