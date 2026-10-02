import type { Plan, SavingsAccount } from './budgetModel';
import { aedToFils } from './money';
import { SAMPLE_PLAN } from './sampleData';
import {
  canCloseCycle,
  closeCycle,
  cycleKey,
  cycleResult,
  deposit,
  withdraw,
} from './savingsBalance';

const TODAY = '2026-10-03';
const account: SavingsAccount = SAMPLE_PLAN.savings;

describe('the sample savings account', () => {
  it('starts at the sum of the goals saved amounts: 18,000 + 3,200 + 2,400', () => {
    expect(account.balance).toBe(aedToFils(23600));
    expect(account.entries).toEqual([]);
  });
});

describe('deposit', () => {
  it('adds to the balance and records the change, newest first', () => {
    const a = deposit(account, aedToFils(500), TODAY, '  Bonus  ');
    expect(a.balance).toBe(aedToFils(24100));
    expect(a.entries[0]).toMatchObject({
      kind: 'deposit',
      change: aedToFils(500),
      balanceAfter: aedToFils(24100),
      date: TODAY,
      note: 'Bonus',
    });

    const b = deposit(a, aedToFils(250), TODAY);
    expect(b.balance).toBe(aedToFils(24350));
    expect(b.entries.map((e) => e.balanceAfter)).toEqual([aedToFils(24350), aedToFils(24100)]);
  });

  it('gives every entry a unique id', () => {
    const a = deposit(deposit(account, 100, TODAY), 100, TODAY);
    expect(new Set(a.entries.map((e) => e.id)).size).toBe(2);
  });

  it.each([0, -100])('refuses an amount of %p', (amount) => {
    expect(() => deposit(account, amount, TODAY)).toThrow(RangeError);
  });

  it('does not change the account it was given', () => {
    const before = JSON.stringify(account);
    deposit(account, 100, TODAY);
    expect(JSON.stringify(account)).toBe(before);
  });
});

describe('withdraw', () => {
  it('takes money out and records a negative change', () => {
    const r = withdraw(account, aedToFils(600), TODAY, 'Car repair');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.account.balance).toBe(aedToFils(23000));
      expect(r.account.entries[0]).toMatchObject({
        kind: 'withdrawal',
        change: -aedToFils(600),
        balanceAfter: aedToFils(23000),
        note: 'Car repair',
      });
    }
  });

  it('can take out everything, down to exactly zero', () => {
    const r = withdraw(account, aedToFils(23600), TODAY);
    expect(r.ok && r.account.balance).toBe(0);
  });

  it('refuses to take out more than is saved', () => {
    expect(withdraw(account, aedToFils(23600) + 1, TODAY)).toEqual({
      ok: false,
      reason: 'insufficient',
    });
  });

  it.each([0, -5])('refuses an amount of %p', (amount) => {
    expect(withdraw(account, amount, TODAY)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('cycleResult (sample, hand-calculated)', () => {
  it('income 17,830 minus spending 14,658.33 = +3,171.67', () => {
    expect(cycleResult(SAMPLE_PLAN)).toEqual({
      income: aedToFils(17830),
      spending: 1465833,
      result: 317167,
    });
  });

  it('is negative when spending outruns income', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      expenses: [
        ...SAMPLE_PLAN.expenses,
        {
          id: 'big',
          name: 'Big bill',
          categoryId: 'other_bill',
          amount: aedToFils(5000),
          frequency: 'monthly',
          nextDueInDays: 20,
          kind: 'fixed',
          essential: false,
          spentSoFar: 0,
        },
      ],
    };
    expect(cycleResult(plan).result).toBe(317167 - aedToFils(5000)); // -1,828.33
  });

  it('does not count goal contributions as spending', () => {
    const noGoals: Plan = { ...SAMPLE_PLAN, goals: [] };
    expect(cycleResult(noGoals).result).toBe(cycleResult(SAMPLE_PLAN).result);
  });
});

describe('closing a pay cycle', () => {
  it('adds the result: 23,600 + 3,171.67 = 26,771.67', () => {
    const closed = closeCycle(SAMPLE_PLAN, TODAY)!;
    expect(closed.balance).toBe(2677167);
    expect(closed.entries[0]).toMatchObject({
      kind: 'cycle',
      change: 317167,
      balanceAfter: 2677167,
      date: TODAY,
    });
  });

  it('identifies the cycle by its payday, 12 days away', () => {
    expect(cycleKey(SAMPLE_PLAN, TODAY)).toBe('2026-10-15');
    expect(closeCycle(SAMPLE_PLAN, TODAY)!.lastClosedCycle).toBe('2026-10-15');
  });

  it('can only be added once per cycle', () => {
    const closed = closeCycle(SAMPLE_PLAN, TODAY)!;
    const plan: Plan = { ...SAMPLE_PLAN, savings: closed };
    expect(canCloseCycle(plan, TODAY)).toBe(false);
    expect(closeCycle(plan, TODAY)).toBeNull();
  });

  it('can be added again once the next payday (a new cycle) comes round', () => {
    const closed = closeCycle(SAMPLE_PLAN, TODAY)!;
    const nextCycle: Plan = {
      ...SAMPLE_PLAN,
      savings: closed,
      income: SAMPLE_PLAN.income.map((i) => (i.id === 'salary' ? { ...i, nextInDays: 40 } : i)),
    };
    expect(canCloseCycle(nextCycle, TODAY)).toBe(true);
  });

  it('reduces savings when you spent more than you earned', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      expenses: [
        ...SAMPLE_PLAN.expenses,
        {
          id: 'big',
          name: 'Big bill',
          categoryId: 'other_bill',
          amount: aedToFils(5000),
          frequency: 'monthly',
          nextDueInDays: 20,
          kind: 'fixed',
          essential: false,
          spentSoFar: 0,
        },
      ],
    };
    const closed = closeCycle(plan, TODAY)!;
    expect(closed.balance).toBe(aedToFils(23600) + 317167 - aedToFils(5000)); // 21,771.67
    expect(closed.entries[0]!.change).toBeLessThan(0);
  });

  it('can take the balance below zero, which the screen then points out', () => {
    const plan: Plan = { ...SAMPLE_PLAN, savings: { balance: 100000, entries: [] } };
    const heavy: Plan = {
      ...plan,
      expenses: [
        ...plan.expenses,
        {
          id: 'big',
          name: 'Big bill',
          categoryId: 'other_bill',
          amount: aedToFils(9000),
          frequency: 'monthly',
          nextDueInDays: 20,
          kind: 'fixed',
          essential: false,
          spentSoFar: 0,
        },
      ],
    };
    expect(closeCycle(heavy, TODAY)!.balance).toBeLessThan(0);
  });

  it('does not change the plan it was given', () => {
    const before = JSON.stringify(SAMPLE_PLAN);
    closeCycle(SAMPLE_PLAN, TODAY);
    expect(JSON.stringify(SAMPLE_PLAN)).toBe(before);
  });
});
