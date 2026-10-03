import { emptyPlan, type ExpenseItem, type IncomeItem, type Plan } from './budgetModel';
import { presetRange, summarize, validateRange } from './dashboardRange';
import { aedToFils as aed } from './money';
import {
  addSavings,
  addTransaction,
  setOpeningSavings,
  setSavingsTarget,
  upsertExpenseItem,
  upsertIncomeItem,
} from './planOps';

describe('date presets', () => {
  // 2026-10-15 is a Thursday.
  const today = '2026-10-15';

  it('current month is the whole calendar month', () => {
    expect(presetRange('current-month', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it('last week is the previous full Monday to Sunday', () => {
    expect(presetRange('last-week', today)).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    // On a Monday, last week is the seven days before it.
    expect(presetRange('last-week', '2026-10-12')).toEqual({
      from: '2026-10-05',
      to: '2026-10-11',
    });
    // On a Sunday, the week just ended is still "this week".
    expect(presetRange('last-week', '2026-10-11')).toEqual({
      from: '2026-09-28',
      to: '2026-10-04',
    });
  });

  it('last month crosses year ends and leap years', () => {
    expect(presetRange('last-month', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('last-month', '2026-01-10')).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
    expect(presetRange('last-month', '2028-03-05')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
  });

  it('last quarter is the previous calendar quarter', () => {
    expect(presetRange('last-quarter', today)).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(presetRange('last-quarter', '2026-02-20')).toEqual({
      from: '2025-10-01',
      to: '2025-12-31',
    });
    expect(presetRange('last-quarter', '2026-05-01')).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('last year is the previous calendar year', () => {
    expect(presetRange('last-year', today)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
  });
});

describe('custom ranges', () => {
  it('accepts any valid start and end', () => {
    expect(validateRange('2026-10-01', '2026-10-10')).toBeNull(); // ten days
    expect(validateRange('2024-10-15', '2026-10-14')).toBeNull(); // two years
    expect(validateRange('2026-01-01', '2026-01-31')).toBeNull(); // January 2026
    expect(validateRange('2026-10-05', '2026-10-05')).toBeNull(); // a single day
  });

  it('rejects invalid dates and reversed ranges', () => {
    expect(validateRange('2026-02-30', '2026-03-01')).toBe('invalid-start');
    expect(validateRange('2026-03-01', 'nope')).toBe('invalid-end');
    expect(validateRange('2026-03-02', '2026-03-01')).toBe('order');
  });
});

const salary: IncomeItem = {
  id: 'salary',
  name: 'Salary',
  kind: 'salary',
  amount: aed(10000),
  frequency: 'monthly',
  nextInDays: 0,
  nextDate: '2026-08-25',
  stable: true,
};
const groceries: ExpenseItem = {
  id: 'groc',
  name: 'Groceries',
  categoryId: 'groceries',
  amount: aed(3000),
  frequency: 'monthly',
  nextDueInDays: 0,
  kind: 'variable',
  essential: true,
  spentSoFar: 0,
};

function world(): Plan {
  let p = emptyPlan();
  p = upsertIncomeItem(p, salary, '2026-08-02');
  p = upsertExpenseItem(p, groceries, '2026-08-02');
  p = setOpeningSavings(p, aed(10000), '2026-08-02', '2026-08-02');
  p = setSavingsTarget(p, aed(1000), '2026-08-02');
  p = addTransaction(
    p,
    { date: '2026-09-10', categoryId: 'groceries', amount: aed(800), note: '' },
    '2026-10-15',
  );
  p = addTransaction(
    p,
    { date: '2026-10-05', categoryId: 'groceries', amount: aed(500), note: '' },
    '2026-10-15',
  );
  const r = addSavings(p, aed(2000), '2026-10-06', 'Extra', '2026-10-15');
  if (!r.ok) throw new Error('setup');
  return r.plan;
}

describe('dashboard summary', () => {
  const today = '2026-10-15';
  const p = world();

  it('this month: income to come, spending against budget, and both savings views', () => {
    const s = summarize(p, presetRange('current-month', today), today);
    expect(s.income).toEqual({ received: 0, expected: aed(10000) }); // payday is the 25th
    expect(s.spending.totalActual).toBe(aed(500));
    expect(s.spending.totalBudget).toBe(aed(3000));
    expect(s.spending.totalRemaining).toBe(aed(2500));
    expect(s.savings.period).toBe(aed(2000)); // only the deposit; September is not closed into October
    expect(s.savings.total).toBe(aed(14000)); // 10,000 + 1,000 + 1,000 + 2,000
    expect(s.savings.projection?.projectedClosing).toBe(aed(15000));
  });

  it('last month: the balance at the END of that month, not today', () => {
    const s = summarize(p, presetRange('last-month', today), today);
    expect(s.income).toEqual({ received: aed(10000), expected: 0 });
    expect(s.spending.totalActual).toBe(aed(800));
    expect(s.spending.totalRemaining).toBe(aed(2200));
    expect(s.savings.period).toBe(aed(1000));
    expect(s.savings.total).toBe(aed(12000)); // not 14,000
    expect(s.savings.totalAsOf).toBe('2026-09-30');
    expect(s.savings.projection).toBeNull();
  });

  it('a range before the opening balance says the balance is unknown instead of inventing it', () => {
    const s = summarize(p, { from: '2026-06-01', to: '2026-07-31' }, today);
    expect(s.savings.total).toBeNull();
    expect(s.savings.period).toBe(0);
  });

  it('a custom two-month range adds both months', () => {
    const s = summarize(p, { from: '2026-08-01', to: '2026-09-30' }, today);
    expect(s.income.received).toBe(aed(20000));
    expect(s.spending.totalBudget).toBe(aed(6000));
    expect(s.spending.totalActual).toBe(aed(800));
    expect(s.savings.period).toBe(aed(2000));
    expect(s.savings.total).toBe(aed(12000));
  });

  it('a partial month prorates the everyday budget by days', () => {
    const s = summarize(p, presetRange('last-week', today), today); // 5 to 11 October
    expect(s.spending.totalBudget).toBe(Math.round((aed(3000) * 7) / 31));
    expect(s.spending.totalActual).toBe(aed(500));
  });

  it('filtering never changes the records', () => {
    const before = JSON.stringify(p);
    summarize(p, presetRange('last-year', today), today);
    summarize(p, { from: '2026-01-01', to: '2026-01-31' }, today);
    expect(JSON.stringify(p)).toBe(before);
  });
});
