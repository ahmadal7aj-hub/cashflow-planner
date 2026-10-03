import { emptyPlan, type ExpenseItem, type IncomeItem, type Plan } from './budgetModel';
import { aedToFils as aed } from './money';
import {
  addSavings,
  addTransaction,
  markBillPaid,
  removeExpenseItem,
  removeIncomeItem,
  removeSavingsMovement,
  removeTransaction,
  setOpeningSavings,
  setSavingsTarget,
  upsertExpenseItem,
  upsertIncomeItem,
  withdrawSavings,
} from './planOps';
import { balanceAsOf, maintainSavings, periodSavings, projectMonth } from './savingsEngine';
import { budgetByCategory, isBillPaid, spendingReport } from './spending';

const TODAY = '2026-10-15';

function budget(id: string, categoryId: string, amount: number): ExpenseItem {
  return {
    id,
    name: id,
    categoryId,
    amount: aed(amount),
    frequency: 'monthly',
    nextDueInDays: 0,
    kind: 'variable',
    essential: true,
    spentSoFar: 0,
  };
}

function bill(id: string, categoryId: string, amount: number, dueDate: string): ExpenseItem {
  return {
    id,
    name: id,
    categoryId,
    amount: aed(amount),
    frequency: 'monthly',
    nextDueInDays: 0,
    kind: 'fixed',
    essential: true,
    spentSoFar: 0,
    dueDate,
  };
}

function salary(amount: number, nextDate: string): IncomeItem {
  return {
    id: 'salary',
    name: 'Salary',
    kind: 'salary',
    amount: aed(amount),
    frequency: 'monthly',
    nextInDays: 0,
    nextDate,
    stable: true,
  };
}

function spend(plan: Plan, categoryId: string, amount: number, date: string, today = TODAY): Plan {
  return addTransaction(plan, { date, categoryId, amount: aed(amount), note: '' }, today);
}

describe('budget versus actual spending', () => {
  it('groceries: budget 3,000, spent 500 and 300, remaining 2,200', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3000), TODAY);
    p = spend(p, 'groceries', 500, '2026-10-02');
    p = spend(p, 'groceries', 300, '2026-10-09');
    const row = spendingReport(p, '2026-10-01', '2026-10-31', TODAY).rows.find(
      (r) => r.categoryId === 'groceries',
    )!;
    expect([row.budget, row.actual, row.remaining]).toEqual([aed(3000), aed(800), aed(2200)]);
    expect(row.over).toBe(false);
  });

  it('petrol: budget 1,000, four fills of 200, remaining 200', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('fuel', 'fuel', 1000), TODAY);
    for (const d of ['2026-10-01', '2026-10-06', '2026-10-11', '2026-10-14'])
      p = spend(p, 'fuel', 200, d);
    const row = spendingReport(p, '2026-10-01', '2026-10-31', TODAY).rows[0]!;
    expect([row.budget, row.actual, row.remaining]).toEqual([aed(1000), aed(800), aed(200)]);
  });

  it('shows a negative remaining balance as overspending', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('fuel', 'fuel', 1000), TODAY);
    p = spend(p, 'fuel', 1150, '2026-10-05');
    const row = spendingReport(p, '2026-10-01', '2026-10-31', TODAY).rows[0]!;
    expect(row.remaining).toBe(-aed(150));
    expect(row.over).toBe(true);
  });

  it('keeps unbudgeted spending visible and labelled', () => {
    const p = spend(emptyPlan(), 'dining', 120, '2026-10-05');
    const r = spendingReport(p, '2026-10-01', '2026-10-31', TODAY);
    expect(r.rows[0]).toMatchObject({ categoryId: 'dining', budget: 0, unbudgeted: true });
    expect(r.unbudgetedActual).toBe(aed(120));
    expect(r.totalActual).toBe(aed(120));
  });

  it('ignores spending outside the month', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3000), TODAY);
    p = spend(p, 'groceries', 500, '2026-09-30');
    p = spend(p, 'groceries', 200, '2026-10-01');
    const row = spendingReport(p, '2026-10-01', '2026-10-31', TODAY).rows[0]!;
    expect(row.actual).toBe(aed(200));
  });

  it('a planned bill is not spending until it is marked paid, and paying twice counts once', () => {
    let p = upsertExpenseItem(emptyPlan(), bill('rent', 'rent', 5000, '2026-10-20'), TODAY);
    expect(spendingReport(p, '2026-10-01', '2026-10-31', TODAY).totalActual).toBe(0);
    expect(spendingReport(p, '2026-10-01', '2026-10-31', TODAY).totalBudget).toBe(aed(5000));

    p = markBillPaid(p, 'rent', '2026-10-20', '2026-10-19', TODAY);
    p = markBillPaid(p, 'rent', '2026-10-20', '2026-10-19', TODAY);
    const r = spendingReport(p, '2026-10-01', '2026-10-31', TODAY);
    expect(r.totalActual).toBe(aed(5000));
    expect(r.rows[0]).toMatchObject({ budget: aed(5000), actual: aed(5000), remaining: 0 });
    expect(isBillPaid(p, 'rent', '2026-10-20')).toBe(true);
    expect(isBillPaid(p, 'rent', '2026-11-20')).toBe(false);
  });

  it('prorates everyday budgets for part of a month and counts bills when they fall due', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3100), TODAY);
    p = upsertExpenseItem(p, bill('rent', 'rent', 5000, '2026-10-20'), TODAY);
    const week = budgetByCategory(p, '2026-10-05', '2026-10-11', TODAY); // 7 of 31 days
    expect(week.get('groceries')).toBe(aed(700));
    expect(week.has('rent')).toBe(false);
    const wide = budgetByCategory(p, '2026-10-15', '2026-10-25', TODAY);
    expect(wide.get('rent')).toBe(aed(5000));
  });

  it('a range over two whole months adds both full budgets', () => {
    const p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3000), TODAY);
    // The budget only exists from October, so only October counts in a range that starts in September.
    expect(budgetByCategory(p, '2026-09-01', '2026-11-30', TODAY).get('groceries')).toBe(aed(6000));
  });
});

describe('history is preserved when budgets and bills change', () => {
  it('editing a budget applies from this month and leaves earlier months alone', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3000), '2026-08-10');
    p = upsertExpenseItem(p, { ...budget('groc', 'groceries', 3500) }, TODAY);
    expect(budgetByCategory(p, '2026-08-01', '2026-08-31', TODAY).get('groceries')).toBe(aed(3000));
    expect(budgetByCategory(p, '2026-10-01', '2026-10-31', TODAY).get('groceries')).toBe(aed(3500));
  });

  it('deleting a budget ends it from this month but keeps past months and past transactions', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3000), '2026-08-10');
    p = spend(p, 'groceries', 400, '2026-08-20');
    p = spend(p, 'groceries', 250, '2026-10-02');
    p = removeExpenseItem(p, 'groc', TODAY);
    expect(p.expenses).toHaveLength(0);
    expect(p.transactions).toHaveLength(2);
    const aug = spendingReport(p, '2026-08-01', '2026-08-31', TODAY).rows[0]!;
    expect([aug.budget, aug.actual]).toEqual([aed(3000), aed(400)]);
    const oct = spendingReport(p, '2026-10-01', '2026-10-31', TODAY).rows[0]!;
    expect([oct.budget, oct.actual, oct.unbudgeted]).toEqual([0, aed(250), true]);
  });

  it('deleting a transaction updates the totals', () => {
    let p = upsertExpenseItem(emptyPlan(), budget('groc', 'groceries', 3000), TODAY);
    p = spend(p, 'groceries', 500, '2026-10-02');
    p = removeTransaction(p, p.transactions[0]!.id, TODAY);
    expect(spendingReport(p, '2026-10-01', '2026-10-31', TODAY).rows[0]!.actual).toBe(0);
  });
});

/** A plan where income equals the spending plan plus the savings target, as in the examples. */
function savingsPlan(): Plan {
  let p = emptyPlan();
  p = upsertIncomeItem(p, salary(5000, '2026-09-25'), '2026-09-02');
  p = upsertExpenseItem(p, budget('groc', 'groceries', 4000), '2026-09-02');
  p = setOpeningSavings(p, aed(5000), '2026-09-02', '2026-09-02');
  p = setSavingsTarget(p, aed(1000), '2026-09-02');
  return { ...p, setupDone: true };
}

describe('savings at month end', () => {
  it('overspending of 300 reduces the planned saving: +700, closing 5,700', () => {
    let p = spend(savingsPlan(), 'groceries', 4300, '2026-09-20', '2026-09-20');
    p = maintainSavings(p, '2026-10-02');
    expect(p.savings.closed[0]).toMatchObject({ month: '2026-09', added: aed(700), taken: 0 });
    expect(balanceAsOf(p.savings, '2026-10-02')).toBe(aed(5700));
  });

  it('overspending of 1,200 adds nothing and takes 200 from existing savings: 4,800', () => {
    let p = spend(savingsPlan(), 'groceries', 5200, '2026-09-20', '2026-09-20');
    p = maintainSavings(p, '2026-10-02');
    expect(p.savings.closed[0]).toMatchObject({ added: 0, taken: aed(200) });
    expect(balanceAsOf(p.savings, '2026-10-02')).toBe(aed(4800));
  });

  it('spending exactly the plan saves the full target', () => {
    let p = spend(savingsPlan(), 'groceries', 4000, '2026-09-20', '2026-09-20');
    p = maintainSavings(p, '2026-10-02');
    expect(balanceAsOf(p.savings, '2026-10-02')).toBe(aed(6000));
  });

  it('underspending does not save more than the target; the extra is not auto-saved', () => {
    let p = spend(savingsPlan(), 'groceries', 1000, '2026-09-20', '2026-09-20');
    p = maintainSavings(p, '2026-10-02');
    expect(p.savings.closed[0]).toMatchObject({ added: aed(1000), taken: 0 });
    expect(balanceAsOf(p.savings, '2026-10-02')).toBe(aed(6000));
  });

  it('underspending in one category offsets overspending in another (overall totals)', () => {
    let p = upsertExpenseItem(savingsPlan(), budget('fuel', 'fuel', 0.01), '2026-09-02');
    p = upsertExpenseItem(p, budget('groc', 'groceries', 2000), '2026-09-02');
    p = upsertExpenseItem(p, budget('dine', 'dining', 2000), '2026-09-02');
    // Groceries over by 500, dining under by 500: overall exactly on plan.
    p = spend(p, 'groceries', 2500, '2026-09-10', '2026-09-10');
    p = spend(p, 'dining', 1500, '2026-09-11', '2026-09-11');
    p = maintainSavings(p, '2026-10-02');
    expect(p.savings.closed[0]).toMatchObject({ added: aed(1000), taken: 0 });
  });

  it('closes each finished month once, even if run many times (no duplicates)', () => {
    let p = spend(savingsPlan(), 'groceries', 4300, '2026-09-20', '2026-09-20');
    p = maintainSavings(p, '2026-10-02');
    const again = maintainSavings(maintainSavings(p, '2026-10-02'), '2026-10-20');
    expect(again.savings.closed).toHaveLength(1);
    expect(again.savings.movements.filter((m) => m.kind === 'month-close')).toHaveLength(1);
    expect(balanceAsOf(again.savings, '2026-10-20')).toBe(aed(5700));
  });

  it('catches up several finished months when the app was not opened', () => {
    const p = maintainSavings(savingsPlan(), '2026-12-05');
    expect(p.savings.closed.map((c) => c.month)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(balanceAsOf(p.savings, '2026-12-05')).toBe(aed(5000 + 3 * 1000));
  });

  it('does not close the current month and never counts the opening balance as income', () => {
    const p = maintainSavings(savingsPlan(), '2026-09-28');
    expect(p.savings.closed).toHaveLength(0);
    expect(periodSavings(p.savings, '2026-09-01', '2026-09-30')).toBe(0);
    expect(balanceAsOf(p.savings, '2026-09-28')).toBe(aed(5000));
  });

  it('a back-dated expense in a closed month adds a correction and leaves the closed record', () => {
    let p = maintainSavings(savingsPlan(), '2026-10-02');
    expect(balanceAsOf(p.savings, '2026-10-02')).toBe(aed(6000));
    p = spend(p, 'groceries', 4300, '2026-09-20', '2026-10-03');
    expect(p.savings.closed[0]).toMatchObject({ added: aed(1000), net: aed(700) });
    expect(p.savings.movements.filter((m) => m.kind === 'correction')).toHaveLength(1);
    expect(balanceAsOf(p.savings, '2026-10-03')).toBe(aed(5700));
    // Running maintenance again does not stack another correction.
    p = maintainSavings(p, '2026-10-03');
    expect(p.savings.movements.filter((m) => m.kind === 'correction')).toHaveLength(1);
  });

  it('a zero opening balance and zero target are allowed', () => {
    let p = setOpeningSavings(emptyPlan(), 0, '2026-10-01', TODAY);
    p = setSavingsTarget(p, 0, TODAY);
    expect(balanceAsOf(p.savings, TODAY)).toBe(0);
  });
});

describe('manual savings and the two savings views', () => {
  it('period savings is the net added in the period; total savings is cumulative', () => {
    let p = setOpeningSavings(emptyPlan(), aed(10000), '2026-09-01', '2026-09-01');
    const r1 = addSavings(p, aed(2000), '2026-10-05', 'Extra', '2026-10-05');
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(periodSavings(r1.plan.savings, '2026-10-01', '2026-10-31')).toBe(aed(2000));
    expect(balanceAsOf(r1.plan.savings, '2026-10-31')).toBe(aed(12000));
    // Historical: the end of September is before the extra 2,000 was added.
    expect(balanceAsOf(r1.plan.savings, '2026-09-30')).toBe(aed(10000));
    expect(periodSavings(r1.plan.savings, '2026-09-01', '2026-09-30')).toBe(0);
  });

  it('reports the balance as unknown for dates before the opening date', () => {
    const p = setOpeningSavings(emptyPlan(), aed(10000), '2026-09-01', '2026-09-01');
    expect(balanceAsOf(p.savings, '2026-08-31')).toBeNull();
    expect(balanceAsOf(emptyPlan().savings, '2026-10-01')).toBeNull();
  });

  it('withdrawals reduce savings and cannot exceed the balance; they are not expenses', () => {
    const p = setOpeningSavings(emptyPlan(), aed(1000), '2026-10-01', TODAY);
    const ok = withdrawSavings(p, aed(400), TODAY, '', TODAY);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(balanceAsOf(ok.plan.savings, TODAY)).toBe(aed(600));
    expect(spendingReport(ok.plan, '2026-10-01', '2026-10-31', TODAY).totalActual).toBe(0);
    expect(withdrawSavings(ok.plan, aed(700), TODAY, '', TODAY)).toEqual({
      ok: false,
      reason: 'insufficient',
    });
  });

  it('rejects zero amounts and dates before the opening date for movements', () => {
    const p = setOpeningSavings(emptyPlan(), aed(1000), '2026-10-01', TODAY);
    expect(addSavings(p, 0, TODAY, '', TODAY).ok).toBe(false);
    expect(addSavings(p, 100, '2026-09-01', '', TODAY)).toEqual({
      ok: false,
      reason: 'before-opening',
    });
  });

  it('deleting a manual deposit recalculates the balance; month results cannot be deleted', () => {
    let p = setOpeningSavings(emptyPlan(), aed(1000), '2026-10-01', TODAY);
    const r = addSavings(p, aed(500), TODAY, '', TODAY);
    if (!r.ok) throw new Error('setup');
    p = removeSavingsMovement(r.plan, r.plan.savings.movements[0]!.id, TODAY);
    expect(balanceAsOf(p.savings, TODAY)).toBe(aed(1000));
  });
});

describe('projection for an unfinished month', () => {
  it('estimates using the plan, labelled by the caller as projected', () => {
    let p = spend(savingsPlan(), 'groceries', 4300, '2026-09-20', '2026-09-20');
    const proj = projectMonth(p, '2026-09', '2026-09-20');
    // Spending is already above the plan, so it is the spent amount; saving shrinks to 700.
    expect(proj.spending).toBe(aed(4300));
    expect(proj.added).toBe(aed(700));
    expect(proj.projectedClosing).toBe(aed(5700));
    p = maintainSavings(p, '2026-10-02');
    expect(balanceAsOf(p.savings, '2026-10-02')).toBe(aed(5700));
  });

  it('uses the plan when less has been spent so far', () => {
    const proj = projectMonth(savingsPlan(), '2026-09', '2026-09-10');
    expect(proj.spending).toBe(aed(4000));
    expect(proj.added).toBe(aed(1000));
  });
});

describe('income history', () => {
  it('deleting an income item keeps the months it was received in', () => {
    let p = upsertIncomeItem(emptyPlan(), salary(5000, '2026-08-25'), '2026-08-02');
    p = setOpeningSavings(p, 0, '2026-08-02', '2026-08-02');
    p = removeIncomeItem(p, 'salary', '2026-10-05');
    expect(p.income).toHaveLength(0);
    expect(p.retiredIncome).toHaveLength(1);
    // August and September were closed with the salary; October onwards has none.
    expect(p.savings.closed.map((c) => [c.month, c.income])).toEqual([
      ['2026-08', aed(5000)],
      ['2026-09', aed(5000)],
    ]);
  });
});
