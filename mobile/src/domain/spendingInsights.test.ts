import { deriveForecastInput, type Plan } from './budgetModel';
import { formatAedShort, aedToFils } from './money';
import { computeForecast } from './prototypeForecast';
import { SAMPLE_PLAN } from './sampleData';
import {
  budgetLines,
  cycleElapsedFraction,
  monthlyByGroup,
  paceStatus,
  spendingSummary,
  totalMonthlySpend,
} from './spendingInsights';

const input = deriveForecastInput(SAMPLE_PLAN);
const forecast = computeForecast(input);
const days = input.daysUntilPayday; // 12

describe('cycleElapsedFraction', () => {
  it.each([
    [12, 0.6],
    [30, 0],
    [0, 1],
    [45, 0],
    [-3, 1],
  ])('with %p days to payday, %p of the cycle has passed', (d, expected) => {
    expect(cycleElapsedFraction(d)).toBeCloseTo(expected, 5);
  });
});

describe('paceStatus', () => {
  it('is on track at or just above straight-line pace', () => {
    expect(paceStatus(aedToFils(360), aedToFils(600), 0.6)).toBe('on-track');
    expect(paceStatus(aedToFils(410), aedToFils(600), 0.6)).toBe('on-track'); // < 414 = 360 * 1.15
  });
  it('is ahead when spending outpaces the cycle by more than 15%', () => {
    expect(paceStatus(aedToFils(420), aedToFils(600), 0.6)).toBe('ahead');
  });
  it('is over only when spent exceeds the whole budget', () => {
    expect(paceStatus(aedToFils(600), aedToFils(600), 0.6)).toBe('ahead');
    expect(paceStatus(aedToFils(601), aedToFils(600), 0.6)).toBe('over');
  });
  it('does not flag ordinary spending at the very start of a cycle', () => {
    // 0% of the cycle has passed; spending up to about 11.5% of the budget is normal.
    expect(paceStatus(aedToFils(60), aedToFils(600), 0)).toBe('on-track');
    expect(paceStatus(aedToFils(68), aedToFils(600), 0)).toBe('on-track');
    expect(paceStatus(aedToFils(70), aedToFils(600), 0)).toBe('ahead');
  });

  it('treats a brand-new cycle with no spending as on track', () => {
    expect(paceStatus(0, aedToFils(600), 0)).toBe('on-track');
  });
});

describe('budgetLines (sample)', () => {
  const lines = budgetLines(SAMPLE_PLAN, days);
  const byId = Object.fromEntries(lines.map((l) => [l.id, l]));

  it('lists only everyday budgets, most-used first', () => {
    expect(lines).toHaveLength(8);
    expect(lines[0]?.id).toBe('entertainment'); // 275 of 250
    expect(lines.map((l) => l.id)).not.toContain('rent');
  });

  it('flags over-budget, ahead-of-pace and on-track lines', () => {
    expect(byId.entertainment?.status).toBe('over');
    expect(byId.delivery?.status).toBe('ahead'); // 260 > 300 * 0.6 * 1.15 = 207
    expect(byId.groceries?.status).toBe('on-track');
    expect(byId.salik?.status).toBe('on-track');
  });

  it('never reports a negative remaining budget', () => {
    expect(byId.entertainment?.remaining).toBe(0);
    expect(byId.groceries?.remaining).toBe(aedToFils(1150));
  });
});

describe('monthlyByGroup (sample, hand-calculated)', () => {
  const groups = monthlyByGroup(SAMPLE_PLAN);
  const monthly = Object.fromEntries(groups.map((g) => [g.group, g.monthly]));

  it('rolls fixed bills (at monthly equivalent) and budgets into groups', () => {
    expect(monthly.housing).toBe(aedToFils(3500));
    expect(monthly.family).toBe(aedToFils(3000)); // school 9,000 per quarter
    expect(monthly.food).toBe(aedToFils(2700)); // 1,800 + 600 + 300
    expect(monthly.finance).toBe(aedToFils(1300));
    expect(monthly.transport).toBe(23333 + aedToFils(150 + 120 + 500)); // car cost 2,800/yr + Salik + parking + fuel
    expect(monthly.giving).toBe(aedToFils(1000));
    expect(monthly.lifestyle).toBe(aedToFils(950)); // gym 200 + shopping 500 + entertainment 250
    expect(monthly.bills).toBe(aedToFils(830));
    expect(monthly.health).toBe(aedToFils(250));
    expect(monthly.other).toBe(12500); // visa 1,500/yr
  });

  it('is sorted largest first and totals the monthly spend', () => {
    expect(groups.map((g) => g.group).slice(0, 3)).toEqual(['housing', 'family', 'food']);
    expect(totalMonthlySpend(SAMPLE_PLAN)).toBe(1465833);
  });

  it('ignores one-off items (no monthly equivalent)', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      expenses: [
        ...SAMPLE_PLAN.expenses,
        {
          id: 'x',
          name: 'Eid gifts',
          categoryId: 'other',
          amount: aedToFils(900),
          frequency: 'once',
          nextDueInDays: 3,
          kind: 'fixed',
          essential: false,
          spentSoFar: 0,
        },
      ],
    };
    expect(totalMonthlySpend(plan)).toBe(1465833);
  });
});

describe('spendingSummary (sample, hand-calculated)', () => {
  const s = spendingSummary(SAMPLE_PLAN, forecast, days);

  it('totals everyday budgets and spending', () => {
    expect(s.everydayBudget).toBe(aedToFils(4220));
    expect(s.everydaySpent).toBe(aedToFils(1915)); // 650+160+62+48+340+260+120+275
    expect(s.cycleElapsed).toBeCloseTo(0.6, 5);
  });

  it('reports the bills still to pay before payday', () => {
    expect(s.billsBeforePayday).toBe(aedToFils(7080));
    expect(s.billCount).toBe(7);
  });

  it('compares remaining discretionary budgets with safe-to-spend', () => {
    // dining 260 + delivery 40 + shopping 380 + entertainment 0 = 680
    expect(s.discretionaryRemaining).toBe(aedToFils(680));
    expect(s.discretionaryHeadroom).toBe(aedToFils(1770 - 680));
  });

  it('adds up the UAE driving costs: Salik, parking and fuel', () => {
    expect(s.driving).toEqual({
      spent: aedToFils(62 + 48 + 160),
      budget: aedToFils(150 + 120 + 500),
    });
  });

  it('shows negative headroom when budgets exceed what is safe to spend', () => {
    const tight = computeForecast({ ...input, availableCash: aedToFils(9000) });
    expect(spendingSummary(SAMPLE_PLAN, tight, days).discretionaryHeadroom).toBe(
      aedToFils(1770 - 3000 - 680),
    );
  });
});

describe('formatAedShort', () => {
  it.each([
    [0, 'AED 0'],
    [95000, 'AED 950'],
    [1460000, 'AED 14.6k'],
    [1500000, 'AED 15k'],
    [-250000, '-AED 2.5k'],
  ])('formats %p as %p', (fils, expected) => {
    expect(formatAedShort(fils)).toBe(expected);
  });
});
