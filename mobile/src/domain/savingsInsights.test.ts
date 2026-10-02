import type { SavingsGoal } from './budgetModel';
import { aedToFils } from './money';
import { SAMPLE_PLAN } from './sampleData';
import {
  bigBills,
  emergencyCover,
  essentialMonthlySpend,
  goalProgress,
  gratuityEstimate,
  monthlyIncome,
  savingsSummary,
} from './savingsInsights';

const goal = (over: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 'g',
  name: 'Goal',
  target: aedToFils(10000),
  saved: aedToFils(2000),
  monthlyContribution: aedToFils(500),
  enabled: true,
  ...over,
});

describe('goalProgress', () => {
  it('computes percent, remaining and months to go', () => {
    const p = goalProgress(goal());
    expect(p.remaining).toBe(aedToFils(8000));
    expect(p.pct).toBeCloseTo(0.2, 5);
    expect(p.monthsToGo).toBe(16); // 8,000 / 500
    expect(p.status).toBe('no-deadline');
  });

  it('rounds months up so the plan never promises too early', () => {
    expect(goalProgress(goal({ monthlyContribution: aedToFils(300) })).monthsToGo).toBe(27); // 26.67
  });

  it('has no ETA when nothing is set aside', () => {
    expect(goalProgress(goal({ monthlyContribution: 0 })).monthsToGo).toBeNull();
  });

  it('is done once saved reaches the target, even above it', () => {
    const p = goalProgress(goal({ saved: aedToFils(10500) }));
    expect(p.status).toBe('done');
    expect(p.remaining).toBe(0);
    expect(p.pct).toBe(1);
    expect(p.monthsToGo).toBe(0);
  });

  it('is paused when disabled', () => {
    expect(goalProgress(goal({ enabled: false })).status).toBe('paused');
  });

  it('with a deadline, says how much per month is needed and whether you are on track', () => {
    // 8,000 left in 150 days (5 months) needs 1,600 a month.
    const behind = goalProgress(goal({ targetInDays: 150 }));
    expect(behind.neededPerMonth).toBe(aedToFils(1600));
    expect(behind.status).toBe('behind');
    const ok = goalProgress(goal({ targetInDays: 150, monthlyContribution: aedToFils(1600) }));
    expect(ok.status).toBe('on-track');
  });

  it('a deadline inside a month needs the whole remainder, not an inflated monthly rate', () => {
    // 8,000 left with 0, 10 or 29 days to go: all of it is needed within the month.
    for (const days of [0, 10, 29, 30]) {
      expect(goalProgress(goal({ targetInDays: days })).neededPerMonth).toBe(aedToFils(8000));
    }
    expect(goalProgress(goal({ targetInDays: 0 })).status).toBe('behind');
  });

  it('beyond a month it spreads the remainder over the months available', () => {
    expect(goalProgress(goal({ targetInDays: 60 })).neededPerMonth).toBe(aedToFils(4000));
  });
});

describe('sample plan: goals', () => {
  const byId = Object.fromEntries(SAMPLE_PLAN.goals.map((g) => [g.id, goalProgress(g)]));

  it('emergency fund: 18,000 of 45,000, 54 months at 500', () => {
    expect(byId.emergency?.pct).toBeCloseTo(0.4, 5);
    expect(byId.emergency?.monthsToGo).toBe(54);
    expect(byId.emergency?.emergency).toBe(true);
  });

  it('gold: 3,200 of 10,000, 23 months at 300', () => {
    expect(byId.gold?.monthsToGo).toBe(23); // 6,800 / 300 = 22.67
  });

  it('summer travel is behind: needs 1,120 a month, sets aside 400', () => {
    expect(byId.travel?.status).toBe('behind');
    expect(byId.travel?.neededPerMonth).toBe(aedToFils(1120));
  });
});

describe('emergency cover (sample, hand-calculated)', () => {
  it('essential monthly spend = bills at monthly equivalent + essential budgets', () => {
    // rent 3500 + DEWA 450 + internet 380 + car 1300 + health 250 + remittance 1000 + school 3000
    // + car reg 233.33 + visa 125 + groceries 1800 + fuel 500 + Salik 150 + parking 120
    expect(essentialMonthlySpend(SAMPLE_PLAN)).toBe(1280833);
  });

  it('covers about 1.4 months and is "building"', () => {
    const c = emergencyCover(SAMPLE_PLAN)!;
    expect(c.months).toBeCloseTo(18000 / 12808.33, 3);
    expect(c.level).toBe('building');
    expect(c.threeMonthTarget).toBe(3842499);
    expect(c.gapToThreeMonths).toBe(3842499 - aedToFils(18000));
  });

  it('levels: none, low, building, solid', () => {
    const withSaved = (aed: number) =>
      emergencyCover({
        ...SAMPLE_PLAN,
        goals: SAMPLE_PLAN.goals.map((g) =>
          g.purpose === 'emergency' ? { ...g, saved: aedToFils(aed) } : g,
        ),
      })!.level;
    expect(withSaved(0)).toBe('none');
    expect(withSaved(5000)).toBe('low');
    expect(withSaved(18000)).toBe('building');
    expect(withSaved(40000)).toBe('solid');
  });

  it('is null when no goal is marked as the emergency fund', () => {
    expect(
      emergencyCover({
        ...SAMPLE_PLAN,
        goals: SAMPLE_PLAN.goals.map((g) => ({ ...g, purpose: undefined })),
      }),
    ).toBeNull();
  });
});

describe('savingsSummary (sample, hand-calculated)', () => {
  const s = savingsSummary(SAMPLE_PLAN);

  it('income per month: salary 15,000 + side work 1,500 + bonus 15,000/12', () => {
    expect(monthlyIncome(SAMPLE_PLAN)).toBe(aedToFils(17750));
    expect(s.monthlyIncome).toBe(aedToFils(17750));
  });

  it('saves 1,200 a month = 6.8% of income', () => {
    expect(s.monthlySaved).toBe(aedToFils(1200));
    expect(s.savingsRate).toBeCloseTo(0.0676, 3);
  });

  it('totals everything saved so far', () => {
    expect(s.totalSaved).toBe(aedToFils(18000 + 3200 + 2400));
  });

  it('unallocated = income - monthly spending - savings = 17,750 - 14,658.33 - 1,200', () => {
    expect(s.unallocatedMonthly).toBe(189167);
  });

  it('ignores paused goals in the monthly savings figure', () => {
    const paused = {
      ...SAMPLE_PLAN,
      goals: SAMPLE_PLAN.goals.map((g) => (g.id === 'gold' ? { ...g, enabled: false } : g)),
    };
    expect(savingsSummary(paused).monthlySaved).toBe(aedToFils(900));
  });
});

describe('bigBills (sample, hand-calculated)', () => {
  const bills = bigBills(SAMPLE_PLAN);

  it('lists non-monthly bills soonest first', () => {
    expect(bills.map((b) => b.id)).toEqual(['school', 'carreg', 'visa']);
  });

  it('works out the monthly amount needed to be ready on time', () => {
    const [school, carreg, visa] = bills;
    expect(school?.neededPerMonth).toBe(aedToFils(4500)); // 9,000 over 2 months
    expect(carreg?.neededPerMonth).toBe(aedToFils(700)); // 2,800 over 4 months
    expect(visa?.neededPerMonth).toBe(21429); // 1,500 over 7 months, rounded up
  });

  it('gives a bill due within a month a one-month runway, never zero', () => {
    const soon = {
      ...SAMPLE_PLAN,
      expenses: SAMPLE_PLAN.expenses.map((e) =>
        e.id === 'school' ? { ...e, nextDueInDays: 0 } : e,
      ),
    };
    expect(bigBills(soon)[0]?.monthsToPrepare).toBe(1);
  });
});

describe('gratuityEstimate (illustrative)', () => {
  it('sample: 4 years x 21 days x (9,000 / 30) = 25,200', () => {
    expect(gratuityEstimate(SAMPLE_PLAN.employment!)).toBe(aedToFils(25200));
  });

  it('pays nothing under one year of service', () => {
    expect(gratuityEstimate({ yearsOfService: 0.9, basicMonthly: aedToFils(9000) })).toBe(0);
  });

  it('uses 30 days per year after the first five years', () => {
    // 5 x 21 + 2 x 30 = 165 days x 300 = 49,500
    expect(gratuityEstimate({ yearsOfService: 7, basicMonthly: aedToFils(9000) })).toBe(
      aedToFils(49500),
    );
  });

  it('prorates part years', () => {
    // 2.5 x 21 = 52.5 days x 300 = 15,750
    expect(gratuityEstimate({ yearsOfService: 2.5, basicMonthly: aedToFils(9000) })).toBe(
      aedToFils(15750),
    );
  });

  it('is capped at two years of basic wage', () => {
    const e = gratuityEstimate({ yearsOfService: 40, basicMonthly: aedToFils(9000) });
    expect(e).toBe(aedToFils(9000 * 24));
  });

  it('handles zero or negative wage safely', () => {
    expect(gratuityEstimate({ yearsOfService: 5, basicMonthly: 0 })).toBe(0);
  });
});
