import { deriveForecastInput } from './budgetModel';
import { aedToFils } from './money';
import { monthlySplit } from './monthlyPlan';
import { SAMPLE_PLAN } from './sampleData';

describe('monthlySplit', () => {
  it('splits the sample month: income, goals and investing, then what is left', () => {
    const s = monthlySplit(SAMPLE_PLAN);
    expect(s.income).toBe(aedToFils(17830));
    expect(s.generalSavings).toBe(0);
    expect(s.goalSavings).toBe(aedToFils(1200));
    expect(s.investing).toBe(0);
    expect(s.leftToSpend).toBe(aedToFils(16630));
    expect(s.room).toBe(s.leftToSpend - s.plannedSpending);
  });

  it('subtracts a general monthly saving from what is left to spend', () => {
    const s = monthlySplit({ ...SAMPLE_PLAN, monthlySavings: aedToFils(2000) });
    expect(s.generalSavings).toBe(aedToFils(2000));
    expect(s.leftToSpend).toBe(aedToFils(14630));
  });

  it('goes negative when more is set aside than comes in', () => {
    const s = monthlySplit({ ...SAMPLE_PLAN, monthlySavings: aedToFils(20000) });
    expect(s.leftToSpend).toBeLessThan(0);
  });

  it('reserves the general saving in the forecast', () => {
    const base = deriveForecastInput(SAMPLE_PLAN);
    const more = deriveForecastInput({ ...SAMPLE_PLAN, monthlySavings: aedToFils(500) });
    expect(more.savingsReserve - base.savingsReserve).toBe(aedToFils(500));
  });
});
