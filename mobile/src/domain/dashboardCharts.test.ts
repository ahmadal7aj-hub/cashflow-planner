import { emptyPlan, type ExpenseItem, type IncomeItem, type Plan } from './budgetModel';
import {
  balanceByMonth,
  incomeBySource,
  incomeByMonth,
  monthBuckets,
  rangeElapsed,
  savingsByMonth,
  shortMonth,
  spendingByMonth,
} from './dashboardCharts';
import { summarize } from './dashboardRange';
import { aedToFils as aed } from './money';
import {
  addSavings,
  addTransaction,
  setOpeningSavings,
  upsertExpenseItem,
  upsertIncomeItem,
} from './planOps';

const today = '2026-10-15';
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
const side: IncomeItem = {
  id: 'side',
  name: 'Side work',
  kind: 'other',
  amount: aed(1000),
  frequency: 'monthly',
  nextInDays: 0,
  nextDate: '2026-09-05',
  stable: false,
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
  p = upsertIncomeItem(p, side, '2026-08-02');
  p = upsertExpenseItem(p, groceries, '2026-08-02');
  p = setOpeningSavings(p, aed(10000), '2026-08-02', '2026-08-02');
  p = addTransaction(
    p,
    { date: '2026-09-10', categoryId: 'groceries', amount: aed(800), note: '' },
    today,
  );
  p = addTransaction(
    p,
    { date: '2026-10-05', categoryId: 'groceries', amount: aed(500), note: '' },
    today,
  );
  const a = addSavings(p, aed(2000), '2026-09-12', '', today);
  if (!a.ok) throw new Error('setup');
  const b = addSavings(a.plan, aed(500), '2026-10-03', '', today);
  if (!b.ok) throw new Error('setup');
  return b.plan;
}

const range = { from: '2026-08-01', to: '2026-10-31' };

describe('month buckets', () => {
  it('splits a range into months, clipping the first and last', () => {
    const b = monthBuckets({ from: '2026-08-20', to: '2026-10-10' });
    expect(b.map((x) => [x.month, x.from, x.to])).toEqual([
      ['2026-08', '2026-08-20', '2026-08-31'],
      ['2026-09', '2026-09-01', '2026-09-30'],
      ['2026-10', '2026-10-01', '2026-10-10'],
    ]);
  });

  it('shows only the last 12 months of a longer range', () => {
    const b = monthBuckets({ from: '2024-01-01', to: '2026-10-31' });
    expect(b).toHaveLength(12);
    expect(b[0]!.month).toBe('2025-11');
    expect(b[11]!.month).toBe('2026-10');
  });
});

describe('chart figures match the summary figures', () => {
  const p = world();

  it('spending per month adds up to the total spent in the summary', () => {
    const by = spendingByMonth(p, range);
    expect(by.map((x) => x.value)).toEqual([0, aed(800), aed(500)]);
    expect(by.reduce((s, x) => s + x.value, 0)).toBe(
      summarize(p, range, today).spending.totalActual,
    );
  });

  it('savings per month adds up to the period savings in the summary', () => {
    const by = savingsByMonth(p, range, today);
    expect(by.map((x) => x.value)).toEqual([0, aed(2000), aed(500)]);
    expect(by.reduce((s, x) => s + x.value, 0)).toBe(summarize(p, range, today).savings.period);
  });

  it('income by source and by month add up to the received income in the summary', () => {
    const received = summarize(p, range, today).income;
    const sources = incomeBySource(p, range, today);
    expect(sources.reduce((s, x) => s + x.received, 0)).toBe(received.received);
    expect(sources.reduce((s, x) => s + x.expected, 0)).toBe(received.expected);
    expect(sources.map((s) => s.name)).toEqual(['Salary', 'Side work']);
    const months = incomeByMonth(p, range, today);
    expect(months.reduce((s, x) => s + x.value, 0)).toBe(received.received);
  });

  it('leaves out sources with nothing in the range', () => {
    expect(incomeBySource(p, { from: '2026-01-01', to: '2026-01-31' }, today)).toEqual([]);
  });
});

describe('how much of the range has passed', () => {
  it('is 0 before the range, 1 after, and a fraction during', () => {
    expect(rangeElapsed({ from: '2026-10-01', to: '2026-10-31' }, '2026-09-30')).toBe(0);
    expect(rangeElapsed({ from: '2026-10-01', to: '2026-10-31' }, '2026-11-01')).toBe(1);
    expect(rangeElapsed({ from: '2026-10-01', to: '2026-10-10' }, '2026-10-05')).toBe(0.5);
  });
});

describe('short month labels and month-end balances', () => {
  it('names months briefly, with the year when asked', () => {
    expect(shortMonth('2026-10')).toBe('Oct');
    expect(shortMonth('2025-01', true)).toBe('Jan 25');
  });

  it('gives the balance at the end of each month, and nothing before the first record', () => {
    const p = world();
    const b = balanceByMonth(p, { from: '2026-07-01', to: '2026-10-31' }, today);
    expect(b.map((x) => x.value)).toEqual([null, aed(10000), aed(12000), aed(12500)]);
  });
});
