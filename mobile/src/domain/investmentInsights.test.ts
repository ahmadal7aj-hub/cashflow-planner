import { deriveForecastInput, type Investment, type Plan } from './budgetModel';
import {
  INVESTMENT_TYPES,
  allocationByType,
  getInvestmentType,
  investmentLine,
  investmentMonthlyIncome,
  investmentSummary,
} from './investmentInsights';
import { aedToFils } from './money';
import { computeForecast } from './prototypeForecast';
import { SAMPLE_PLAN } from './sampleData';
import { monthlyIncome } from './savingsInsights';

const [etf, gold, reit] = SAMPLE_PLAN.investments as [Investment, Investment, Investment];

describe('investmentLine (sample, hand-calculated)', () => {
  it('index fund: 20,000 in, worth 22,400, a gain of 2,400 (12%)', () => {
    const l = investmentLine(etf);
    expect(l.gain).toBe(aedToFils(2400));
    expect(l.gainRatio).toBeCloseTo(0.12, 5);
    expect(l.monthlyIncome).toBe(0);
    expect(l.typeLabel).toBe('Funds and ETFs');
  });

  it('gold: 8,000 in, worth 9,100, a gain of 1,100 (13.75%)', () => {
    const l = investmentLine(gold);
    expect(l.gain).toBe(aedToFils(1100));
    expect(l.gainRatio).toBeCloseTo(0.1375, 5);
  });

  it('property fund: a gain of 600 (4%) and 240 every 3 months = 80 a month', () => {
    const l = investmentLine(reit);
    expect(l.gain).toBe(aedToFils(600));
    expect(l.gainRatio).toBeCloseTo(0.04, 5);
    expect(l.monthlyIncome).toBe(aedToFils(80));
  });

  it('shows a loss as a negative gain', () => {
    const l = investmentLine({ ...etf, currentValue: aedToFils(17000) });
    expect(l.gain).toBe(-aedToFils(3000));
    expect(l.gainRatio).toBeCloseTo(-0.15, 5);
  });

  it('never divides by zero when nothing is invested', () => {
    const l = investmentLine({ ...etf, invested: 0, currentValue: aedToFils(500) });
    expect(l.gainRatio).toBe(0);
    expect(Number.isFinite(l.gainRatio)).toBe(true);
  });

  it('spreads yearly and weekly income over a month', () => {
    expect(
      investmentLine({ ...etf, incomeAmount: aedToFils(1200), incomeFrequency: 'annual' })
        .monthlyIncome,
    ).toBe(aedToFils(100));
    expect(
      investmentLine({ ...etf, incomeAmount: aedToFils(100), incomeFrequency: 'weekly' })
        .monthlyIncome,
    ).toBe(43333);
  });
});

describe('investmentSummary (sample, hand-calculated)', () => {
  const s = investmentSummary(SAMPLE_PLAN);

  it('totals what is invested, what it is worth and the gain', () => {
    expect(s.totalInvested).toBe(aedToFils(43000)); // 20,000 + 8,000 + 15,000
    expect(s.totalValue).toBe(aedToFils(47100)); // 22,400 + 9,100 + 15,600
    expect(s.totalGain).toBe(aedToFils(4100));
    expect(s.gainRatio).toBeCloseTo(4100 / 43000, 5); // 9.5%
    expect(s.count).toBe(3);
  });

  it('adds up income and works out the yearly yield on current value', () => {
    expect(s.monthlyIncome).toBe(aedToFils(80));
    expect(investmentMonthlyIncome(SAMPLE_PLAN)).toBe(aedToFils(80));
    expect(s.incomeYield).toBeCloseTo((80 * 12) / 47100, 5); // about 2.0% a year
  });

  it('counts only enabled monthly contributions', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      investments: [
        { ...etf, monthlyContribution: aedToFils(500) },
        { ...gold, monthlyContribution: aedToFils(300), enabled: false },
        reit,
      ],
    };
    expect(investmentSummary(plan).monthlyContributions).toBe(aedToFils(500));
  });

  it('copes with no investments', () => {
    const s0 = investmentSummary({ ...SAMPLE_PLAN, investments: [] });
    expect(s0).toMatchObject({
      totalInvested: 0,
      totalValue: 0,
      totalGain: 0,
      gainRatio: 0,
      monthlyIncome: 0,
      incomeYield: 0,
      count: 0,
    });
  });

  it('does not change the plan it was given', () => {
    const before = JSON.stringify(SAMPLE_PLAN);
    investmentSummary(SAMPLE_PLAN);
    allocationByType(SAMPLE_PLAN);
    expect(JSON.stringify(SAMPLE_PLAN)).toBe(before);
  });
});

describe('allocationByType', () => {
  it('splits current value by type, largest first, and the shares add up to one', () => {
    const slices = allocationByType(SAMPLE_PLAN);
    expect(slices.map((s) => [s.type, s.value])).toEqual([
      ['funds', aedToFils(22400)],
      ['real-estate', aedToFils(15600)],
      ['gold', aedToFils(9100)],
    ]);
    expect(slices[0]?.share).toBeCloseTo(22400 / 47100, 5);
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 5);
  });

  it('combines two investments of the same type', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      investments: [etf, { ...etf, id: 'etf2', currentValue: aedToFils(1000) }],
    };
    expect(allocationByType(plan)).toHaveLength(1);
    expect(allocationByType(plan)[0]?.value).toBe(aedToFils(23400));
  });

  it('leaves out investments that are worth nothing', () => {
    const plan: Plan = { ...SAMPLE_PLAN, investments: [etf, { ...gold, currentValue: 0 }] };
    expect(allocationByType(plan).map((s) => s.type)).toEqual(['funds']);
  });

  it('is empty with no investments', () => {
    expect(allocationByType({ ...SAMPLE_PLAN, investments: [] })).toEqual([]);
  });
});

describe('how investments feed the rest of the plan', () => {
  const base = computeForecast(deriveForecastInput(SAMPLE_PLAN));

  it('sample investments have no monthly contribution, so safe-to-spend is unchanged at 1,770', () => {
    expect(base.safeToSpend).toBe(aedToFils(1770));
  });

  it('a planned monthly contribution is set aside and lowers safe-to-spend by that amount', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      investments: [{ ...etf, monthlyContribution: aedToFils(500) }, gold, reit],
    };
    const f = computeForecast(deriveForecastInput(plan));
    expect(f.safeToSpend).toBe(aedToFils(1270)); // 1,770 - 500
    expect(f.savingsReserve).toBe(aedToFils(1700)); // 1,200 goals + 500 investing
  });

  it('a paused contribution is not set aside', () => {
    const plan: Plan = {
      ...SAMPLE_PLAN,
      investments: [{ ...etf, monthlyContribution: aedToFils(500), enabled: false }, gold, reit],
    };
    expect(computeForecast(deriveForecastInput(plan)).safeToSpend).toBe(aedToFils(1770));
  });

  it('investment income raises monthly income and the end-of-cycle result', () => {
    const none: Plan = { ...SAMPLE_PLAN, investments: [] };
    expect(monthlyIncome(SAMPLE_PLAN) - monthlyIncome(none)).toBe(aedToFils(80));
  });
});

describe('investment types', () => {
  it('have unique ids, readable labels and a lookup with a safe fallback', () => {
    const ids = INVESTMENT_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getInvestmentType('real-estate').incomeLabel).toBe('Rent or dividends received');
    expect(getInvestmentType('stocks').label).toBe('Stocks');
    expect(getInvestmentType('nope' as never).id).toBe('other');
  });

  it('include the kinds of investment people in the UAE commonly hold', () => {
    const labels = INVESTMENT_TYPES.map((t) => t.label).join('|');
    for (const word of ['Stocks', 'Funds', 'Gold', 'Real estate', 'Sukuk', 'Crypto', 'Business']) {
      expect(labels).toContain(word);
    }
  });
});
