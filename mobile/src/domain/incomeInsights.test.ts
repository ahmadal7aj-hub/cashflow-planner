import { deriveForecastInput } from './budgetModel';
import { buildInsights } from './insights';
import {
  incomeBreakdown,
  incomeRange,
  incomeSummary,
  netPerCycle,
  upcomingIncome,
} from './incomeInsights';
import { aedToFils } from './money';
import { computeForecast } from './prototypeForecast';
import { SAMPLE_HISTORY, SAMPLE_PLAN } from './sampleData';

describe('incomeBreakdown (sample, hand-calculated)', () => {
  const sources = incomeBreakdown(SAMPLE_PLAN);

  it('converts every source to a monthly value, largest first', () => {
    expect(sources.map((s) => [s.id, s.monthly])).toEqual([
      ['salary', aedToFils(15000)],
      ['side', aedToFils(1500)],
      ['bonus', aedToFils(1250)], // 15,000 a year
    ]);
  });

  it('shares add up to one', () => {
    expect(sources[0]?.share).toBeCloseTo(15000 / 17750, 5);
    expect(sources.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 5);
  });

  it('omits one-off income, which has no monthly value', () => {
    const plan = {
      ...SAMPLE_PLAN,
      income: [
        ...SAMPLE_PLAN.income,
        {
          id: 'gift',
          name: 'Gift',
          kind: 'other' as const,
          amount: aedToFils(2000),
          frequency: 'once' as const,
          nextInDays: 10,
          stable: false,
        },
      ],
    };
    expect(incomeBreakdown(plan).map((s) => s.id)).not.toContain('gift');
  });

  it('is empty with no income', () => {
    expect(incomeBreakdown({ ...SAMPLE_PLAN, income: [] })).toEqual([]);
  });
});

describe('incomeSummary (sample, hand-calculated)', () => {
  const s = incomeSummary(SAMPLE_PLAN);

  it('splits predictable from variable income', () => {
    expect(s.monthlyTotal).toBe(aedToFils(17750));
    expect(s.monthlyStable).toBe(aedToFils(15000));
    expect(s.monthlyVariable).toBe(aedToFils(2750));
    expect(s.stableShare).toBeCloseTo(0.845, 3);
  });

  it('predictable income covers spending (102%) but not spending plus savings', () => {
    expect(s.monthlySpend).toBe(1465833);
    expect(s.stableCoverage).toBeCloseTo(1.0233, 3);
    expect(s.stableGapAfterSavings).toBe(-85833); // 15,000 - 14,658.33 - 1,200
  });

  it('copes with no income and no spending', () => {
    const empty = incomeSummary({ ...SAMPLE_PLAN, income: [], expenses: [], goals: [] });
    expect(empty.monthlyTotal).toBe(0);
    expect(empty.stableShare).toBe(0);
    expect(empty.stableCoverage).toBe(0);
    expect(Number.isFinite(empty.stableGapAfterSavings)).toBe(true);
  });
});

describe('upcomingIncome', () => {
  it('lists the next two months of arrivals, soonest first', () => {
    const e = upcomingIncome(SAMPLE_PLAN, 60);
    expect(e.map((x) => [x.name, x.inDays])).toEqual([
      ['Monthly salary', 12],
      ['Side work', 20],
      ['Monthly salary', 42],
      ['Side work', 50],
    ]);
  });

  it('excludes income beyond the window and in the past', () => {
    expect(upcomingIncome(SAMPLE_PLAN, 10)).toEqual([]);
    const past = {
      ...SAMPLE_PLAN,
      income: SAMPLE_PLAN.income.map((i) => ({ ...i, nextInDays: -1 })),
    };
    expect(upcomingIncome(past, 60)).toEqual([]);
  });
});

describe('history helpers', () => {
  it('net per cycle = income - spending', () => {
    expect(netPerCycle(SAMPLE_HISTORY.income, SAMPLE_HISTORY.spending)).toEqual(
      [3100, 3200, 1700, 4800, 2500, 3150].map(aedToFils),
    );
  });

  it('shows negative net when spending outruns income', () => {
    expect(netPerCycle([aedToFils(1000)], [aedToFils(1500)])).toEqual([-aedToFils(500)]);
  });

  it('income range over six cycles', () => {
    expect(incomeRange(SAMPLE_HISTORY.income)).toEqual({
      min: aedToFils(16800),
      max: aedToFils(19000),
      average: aedToFils(17575),
    });
    expect(incomeRange([])).toBeNull();
  });
});

describe('buildInsights (sample, hand-calculated)', () => {
  const f = computeForecast(deriveForecastInput(SAMPLE_PLAN));
  const insights = buildInsights(SAMPLE_PLAN, f);

  it('orders by severity, then size', () => {
    expect(insights.map((i) => i.id)).toEqual([
      'over-entertainment',
      'bill-school',
      'ahead-delivery',
      'goal-travel',
      'income-gap',
    ]);
  });

  it('reports the amounts behind each insight', () => {
    const by = Object.fromEntries(insights.map((i) => [i.id, i]));
    expect(by['over-entertainment']).toMatchObject({
      severity: 'attention',
      amount: aedToFils(25),
    });
    expect(by['bill-school']).toMatchObject({ days: 40, amount: aedToFils(4500) });
    expect(by['ahead-delivery']?.amount).toBe(aedToFils(40));
    expect(by['goal-travel']?.amount).toBe(aedToFils(1120));
    expect(by['income-gap']?.amount).toBe(85833);
  });

  it('puts a shortfall first', () => {
    const tight = computeForecast({
      ...deriveForecastInput(SAMPLE_PLAN),
      availableCash: aedToFils(2000),
    });
    const list = buildInsights(SAMPLE_PLAN, tight);
    expect(list[0]?.kind).toBe('shortfall');
  });

  it('flags tight discretionary budgets only when there is no shortfall', () => {
    // Cash 8,000: safe 0 or negative. Cash chosen so safe is positive but below remaining dining etc.
    const input = deriveForecastInput(SAMPLE_PLAN);
    const f2 = computeForecast({ ...input, availableCash: aedToFils(10000) }); // safe = -230 -> shortfall
    expect(buildInsights(SAMPLE_PLAN, f2).map((i) => i.kind)).not.toContain('discretionary-tight');
    const f3 = computeForecast({ ...input, availableCash: aedToFils(10400) }); // safe 170 < 680 remaining
    expect(buildInsights(SAMPLE_PLAN, f3).map((i) => i.kind)).toContain('discretionary-tight');
  });

  it('calls out a low emergency fund', () => {
    const low = {
      ...SAMPLE_PLAN,
      goals: SAMPLE_PLAN.goals.map((g) =>
        g.purpose === 'emergency' ? { ...g, saved: aedToFils(5000) } : g,
      ),
    };
    const list = buildInsights(low, computeForecast(deriveForecastInput(low)));
    expect(list.map((i) => i.kind)).toContain('emergency-low');
  });

  it('is quiet when everything is fine', () => {
    const calm = {
      ...SAMPLE_PLAN,
      expenses: SAMPLE_PLAN.expenses
        .filter((e) => e.kind === 'variable')
        .map((e) => ({ ...e, spentSoFar: 0 })),
      goals: [],
      income: [{ ...SAMPLE_PLAN.income[0]!, amount: aedToFils(30000) }],
    };
    const list = buildInsights(calm, computeForecast(deriveForecastInput(calm)));
    expect(list).toEqual([]);
  });
});
