import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadPlan, savePlan, STORAGE_KEY } from '../domain/persistence';
import { addTransaction } from '../domain/planOps';
import { balanceAsOf } from '../domain/savingsEngine';
import { aed, bill, everyday, salary, userWith } from '../testing/app';
import { mountProvider } from '../testing/provider';

afterEach(async () => {
  jest.useRealTimers();
  await AsyncStorage.clear();
});

describe('what you enter is saved on the device and restored on the next open', () => {
  it('income, a budget, spending and savings survive closing and reopening the app', async () => {
    const first = await mountProvider();
    expect(first.state().plan.income).toHaveLength(0);

    await first.act((s) =>
      s.completeSetup({ opening: aed(5000), openingDate: '2026-10-01', target: aed(1000) }),
    );
    await first.act((s) => s.upsertIncome(salary(12000)));
    await first.act((s) => s.upsertExpense(everyday('groc', 'groceries', 'Groceries', 3000)));
    await first.act((s) =>
      s.addSpending({ date: '2026-10-05', categoryId: 'groceries', amount: aed(500), note: '' }),
    );
    await first.act((s) => {
      s.addToSavings(aed(250), 'Extra', '2026-10-06');
    });
    await first.unmount();

    // A second launch reads everything back from the device.
    const second = await mountProvider();
    const plan = second.state().plan;
    expect(plan.income[0]).toMatchObject({ name: 'Salary', amount: aed(12000) });
    expect(plan.expenses[0]).toMatchObject({ categoryId: 'groceries', amount: aed(3000) });
    expect(plan.transactions).toHaveLength(1);
    expect(plan.setupDone).toBe(true);
    expect(balanceAsOf(plan.savings, '2026-10-15')).toBe(aed(5250));
    expect(plan.savings.targets).toEqual([{ from: '2026-10', amount: aed(1000) }]);
    await second.unmount();
  });

  it('a first launch with nothing saved starts empty and not set up', async () => {
    const app = await mountProvider();
    const plan = app.state().plan;
    expect(plan.setupDone).toBe(false);
    expect(plan.income).toHaveLength(0);
    expect(plan.expenses).toHaveLength(0);
    expect(plan.transactions).toHaveLength(0);
    expect(plan.savings.opening).toBeNull();
    await app.unmount();
  });

  it('closes a finished month once; reopening many times never adds it again', async () => {
    await savePlan(AsyncStorage, userWith({ income: [salary(10000, '2026-09-25')] }));

    const a = await mountProvider();
    expect(a.state().plan.savings.closed.map((c) => c.month)).toEqual(['2026-09']);
    expect(balanceAsOf(a.state().plan.savings, '2026-10-15')).toBe(aed(6000));
    await a.unmount();

    for (let i = 0; i < 3; i++) {
      const again = await mountProvider();
      expect(again.state().plan.savings.closed).toHaveLength(1);
      expect(
        again.state().plan.savings.movements.filter((m) => m.kind === 'month-close'),
      ).toHaveLength(1);
      expect(balanceAsOf(again.state().plan.savings, '2026-10-15')).toBe(aed(6000));
      await again.unmount();
    }
    const saved = await loadPlan(AsyncStorage, 't');
    expect(saved.status === 'ok' && saved.plan.savings.closed).toHaveLength(1);
  });

  it('rolls over into a later month on the next open, adding only the new month', async () => {
    await savePlan(AsyncStorage, userWith({ income: [salary(10000, '2026-09-25')] }));
    const oct = await mountProvider('2026-10-15');
    expect(oct.state().plan.savings.closed).toHaveLength(1);
    await oct.unmount();

    const nov = await mountProvider('2026-11-03');
    expect(nov.state().plan.savings.closed.map((c) => c.month)).toEqual(['2026-09', '2026-10']);
    expect(balanceAsOf(nov.state().plan.savings, '2026-11-03')).toBe(aed(7000));
    await nov.unmount();
  });
});

describe('deleting keeps history on the device', () => {
  it('a deleted budget is retired and its past spending stays saved', async () => {
    const plan = addTransaction(
      userWith({
        income: [salary()],
        expenses: [
          everyday('groc', 'groceries', 'Groceries', 3000),
          bill('rent', 'rent', 'Rent', 5000, '2026-10-20'),
        ],
      }),
      { date: '2026-09-20', categoryId: 'groceries', amount: aed(400), note: '' },
      '2026-10-15',
    );
    await savePlan(AsyncStorage, plan);

    const app = await mountProvider();
    await app.act((s) => s.removeExpense('groc'));
    await app.unmount();

    const again = await mountProvider();
    const p = again.state().plan;
    expect(p.expenses.map((e) => e.id)).toEqual(['rent']);
    expect(p.retiredExpenses[0]).toMatchObject({ id: 'groc', deletedFrom: '2026-10' });
    expect(p.transactions).toHaveLength(1);
    await again.unmount();
  });
});

describe('storage safety', () => {
  it('keeps unreadable saved data as a backup and starts with an empty plan', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{broken');
    const app = await mountProvider();
    expect(app.state().plan.income).toHaveLength(0);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k) => k.startsWith('cashflow.backup.unreadable.'))).toBe(true);
    await app.unmount();
  });

  it('does not overwrite data written by a newer version of the app', async () => {
    const raw = JSON.stringify({ schemaVersion: 99, plan: { future: true } });
    await AsyncStorage.setItem(STORAGE_KEY, raw);
    const app = await mountProvider();
    await app.act((s) => s.upsertIncome(salary(1)));
    expect(app.state().plan.income).toHaveLength(1); // works in memory
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(raw); // but the saved data is untouched
    await app.unmount();
  });
});
