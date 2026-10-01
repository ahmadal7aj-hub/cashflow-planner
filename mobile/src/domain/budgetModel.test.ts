import {
  daysUntilPayday,
  deriveForecastInput,
  monthlyEquivalent,
  nextId,
  occurrenceDays,
  remainingBudget,
  type ExpenseItem,
  type Plan,
} from './budgetModel';
import { aedToFils } from './money';
import { computeForecast } from './prototypeForecast';
import { SAMPLE_EXPENSES, SAMPLE_PLAN } from './sampleData';
import { EXPENSE_CATEGORIES, getExpenseCategory, getIncomeCategory } from './uaeCategories';

describe('monthlyEquivalent', () => {
  it.each([
    [aedToFils(3000), 'monthly', aedToFils(3000)],
    [aedToFils(9000), 'quarterly', aedToFils(3000)],
    [aedToFils(2800), 'annual', 23333],
    [aedToFils(100), 'weekly', 43333],
    [aedToFils(500), 'once', 0],
  ] as const)('%p per %s is %p a month', (amount, freq, expected) => {
    expect(monthlyEquivalent(amount, freq)).toBe(expected);
  });
});

describe('occurrenceDays', () => {
  it('finds a monthly bill once inside a 12-day horizon', () => {
    expect(occurrenceDays(4, 'monthly', 12)).toEqual([4]);
  });
  it('finds a weekly bill several times', () => {
    expect(occurrenceDays(2, 'weekly', 20)).toEqual([2, 9, 16]);
  });
  it('excludes items on or after payday, and in the past', () => {
    expect(occurrenceDays(12, 'monthly', 12)).toEqual([]);
    expect(occurrenceDays(-1, 'monthly', 12)).toEqual([]);
  });
  it('treats a one-off as a single occurrence', () => {
    expect(occurrenceDays(5, 'once', 12)).toEqual([5]);
    expect(occurrenceDays(5, 'once', 5)).toEqual([]);
  });
  it('includes a bill due today', () => {
    expect(occurrenceDays(0, 'monthly', 12)).toEqual([0]);
  });
});

describe('deriveForecastInput (sample plan, hand-calculated)', () => {
  const input = deriveForecastInput(SAMPLE_PLAN);
  const f = computeForecast(input);

  it('uses the salary date as the planning horizon', () => {
    expect(daysUntilPayday(SAMPLE_PLAN)).toBe(12);
    expect(input.daysUntilPayday).toBe(12);
  });

  it('reserves fixed bills due before payday (not school fees or annual bills)', () => {
    // rent 3,500 + DEWA 450 + internet 380 + car 1,300 + health 250 + remittance 1,000 + gym 200
    expect(f.reservedCommitments).toBe(aedToFils(7080));
  });

  it('reserves what is still expected on essential everyday budgets only', () => {
    // groceries 1,150 + fuel 340 + Salik 88 + parking 72 (dining, shopping etc. are NOT deducted)
    expect(input.plannedExpenses).toBe(aedToFils(1650));
  });

  it('counts savings contributions once per cycle', () => {
    expect(input.savingsReserve).toBe(aedToFils(1200));
  });

  it('counts no income inside the horizon (salary lands on payday)', () => {
    expect(input.expectedIncome).toBe(0);
  });

  it('safe-to-spend = 12,000 - 7,080 - 1,200 - 300 - 1,650 = 1,770', () => {
    expect(f.safeToSpend).toBe(aedToFils(1770));
    expect(f.dailySafe).toBe(14750);
    expect(f.forecastBalance).toBe(aedToFils(2070));
  });
});

describe('editing the plan changes the forecast', () => {
  const base = SAMPLE_PLAN;
  const safe = (p: Plan) => computeForecast(deriveForecastInput(p)).safeToSpend;

  it('a new fixed bill inside the horizon lowers safe-to-spend by its amount', () => {
    const parking: ExpenseItem = {
      id: 'new',
      name: 'Annual parking permit',
      categoryId: 'parking',
      amount: aedToFils(400),
      frequency: 'once',
      nextDueInDays: 3,
      kind: 'fixed',
      essential: true,
      spentSoFar: 0,
    };
    expect(safe({ ...base, expenses: [...base.expenses, parking] })).toBe(aedToFils(1370));
  });

  it('spending more on an essential budget lowers what is still expected, raising safe-to-spend', () => {
    const expenses = base.expenses.map((e) =>
      e.id === 'groceries' ? { ...e, spentSoFar: aedToFils(1000) } : e,
    );
    expect(safe({ ...base, expenses })).toBe(aedToFils(1770 + 350));
  });

  it('removing a bill raises safe-to-spend', () => {
    const expenses = base.expenses.filter((e) => e.id !== 'gym');
    expect(safe({ ...base, expenses })).toBe(aedToFils(1970));
  });

  it('income arriving before payday raises safe-to-spend', () => {
    const income = base.income.map((i) => (i.id === 'side' ? { ...i, nextInDays: 5 } : i));
    expect(safe({ ...base, income })).toBe(aedToFils(1770 + 1500));
  });

  it('moving payday later extends the horizon and pulls in more bills', () => {
    const income = base.income.map((i) => (i.id === 'salary' ? { ...i, nextInDays: 45 } : i));
    const f = computeForecast(deriveForecastInput({ ...base, income }));
    expect(f.horizonDays).toBe(45);
    // The second round of monthly bills (day 34+) and the school fees (day 40) now fall inside.
    expect(f.reservedCommitments).toBeGreaterThan(aedToFils(7080));
    expect(f.upcoming.map((c) => c.name)).toContain('School fees (term)');
    expect(f.upcoming.filter((c) => c.name === 'Rent')).toHaveLength(2);
  });

  it('keeps the same bills when payday moves within the same bill cycle', () => {
    const income = base.income.map((i) => (i.id === 'salary' ? { ...i, nextInDays: 30 } : i));
    const f = computeForecast(deriveForecastInput({ ...base, income }));
    expect(f.reservedCommitments).toBe(aedToFils(7080));
  });

  it('disabling a goal removes its reserve', () => {
    const goals = base.goals.map((g) => (g.id === 'gold' ? { ...g, enabled: false } : g));
    expect(safe({ ...base, goals })).toBe(aedToFils(1770 + 300));
  });

  it('falls back to a 30-day cycle with no salary item', () => {
    const noSalary = { ...base, income: base.income.filter((i) => i.kind !== 'salary') };
    expect(daysUntilPayday(noSalary)).toBe(30);
  });

  it('does not mutate the plan', () => {
    const before = JSON.stringify(base);
    deriveForecastInput(base);
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('helpers', () => {
  it('remainingBudget never goes negative when overspent', () => {
    const groceries = SAMPLE_EXPENSES.find((e) => e.id === 'groceries')!;
    expect(remainingBudget({ ...groceries, spentSoFar: groceries.amount + 5000 })).toBe(0);
  });

  it('nextId avoids collisions', () => {
    expect(nextId('exp', [{ id: 'exp-1' }, { id: 'exp-2' }])).toBe('exp-3');
    expect(nextId('exp', [{ id: 'exp-2' }])).toBe('exp-3');
    expect(nextId('exp', [])).toBe('exp-1');
  });
});

describe('UAE categories', () => {
  it('include the everyday UAE costs people expect to see', () => {
    const labels = EXPENSE_CATEGORIES.map((c) => c.label).join('|');
    for (const word of ['Salik', 'Parking', 'DEWA', 'du / e&', 'Money sent home', 'School']) {
      expect(labels).toContain(word);
    }
  });

  it('have unique ids and valid lookups', () => {
    const ids = EXPENSE_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getExpenseCategory('salik').kind).toBe('variable');
    expect(getExpenseCategory('does-not-exist').id).toBe('other');
    expect(getIncomeCategory('salary').stable).toBe(true);
  });
});
