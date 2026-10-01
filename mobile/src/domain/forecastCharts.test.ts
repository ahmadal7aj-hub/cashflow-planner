import { buildBalanceTimeline, buildBreakdown } from './forecastCharts';
import { aedToFils } from './money';
import { computeForecast } from './prototypeForecast';
import { SAMPLE_INPUT } from './sampleData';

const sample = computeForecast(SAMPLE_INPUT);

describe('buildBalanceTimeline (sample fixture)', () => {
  const tl = buildBalanceTimeline(sample);

  it('has one entry per day in the horizon, starting today', () => {
    expect(tl.days).toHaveLength(12);
    expect(tl.days[0]?.day).toBe(0);
    expect(tl.days[11]?.day).toBe(11);
  });

  it('starts at today balance and steps down only on due days', () => {
    const b = (d: number) => tl.days[d]?.balance;
    expect(b(0)).toBe(aedToFils(8200));
    expect(b(3)).toBe(aedToFils(8200));
    expect(b(4)).toBe(aedToFils(4700)); // rent 3,500
    expect(b(6)).toBe(aedToFils(4250)); // DEWA 450
    expect(b(9)).toBe(aedToFils(2950)); // car loan 1,300
    expect(b(11)).toBe(aedToFils(2750)); // gym 200
  });

  it('names commitments on their due day', () => {
    expect(tl.days[4]?.dueNames).toEqual(['Rent']);
    expect(tl.days[5]?.dueNames).toEqual([]);
  });

  it('keeps aside savings + buffer + planned = 1,000', () => {
    expect(tl.keptAside).toBe(aedToFils(1000));
  });

  it('final balance minus kept aside equals the raw safe-to-spend', () => {
    const last = tl.days[tl.days.length - 1];
    expect((last?.balance ?? 0) - tl.keptAside).toBe(sample.rawSafeToSpend);
  });

  it('can go negative when commitments exceed cash, matching the shortfall', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, availableCash: aedToFils(1000) });
    const t = buildBalanceTimeline(f);
    const last = t.days[t.days.length - 1];
    expect(last?.balance).toBeLessThan(0);
    expect((last?.balance ?? 0) - t.keptAside).toBe(f.rawSafeToSpend);
  });

  it('handles a 1-day horizon', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, daysUntilPayday: 0 });
    expect(buildBalanceTimeline(f).days).toHaveLength(1);
  });
});

describe('buildBreakdown (sample fixture)', () => {
  const bd = buildBreakdown(sample);

  it('splits the 8,200 available into the five parts and sums to it exactly', () => {
    const byKey = Object.fromEntries(bd.segments.map((s) => [s.key, s.amount]));
    expect(byKey).toEqual({
      commitments: aedToFils(5450),
      savings: aedToFils(500),
      buffer: aedToFils(300),
      planned: aedToFils(200),
      safe: aedToFils(1750),
    });
    expect(bd.segments.reduce((sum, s) => sum + s.amount, 0)).toBe(aedToFils(8200));
    expect(bd.total).toBe(aedToFils(8200));
    expect(bd.shortfall).toBe(0);
  });

  it('drops empty segments', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, safetyBuffer: 0, plannedExpenses: 0 });
    expect(buildBreakdown(f).segments.map((s) => s.key)).not.toContain('buffer');
  });

  it('widens the bar to the money spoken for and reports the shortfall', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, plannedExpenses: aedToFils(3200) });
    const b = buildBreakdown(f);
    expect(b.shortfall).toBe(aedToFils(1250));
    expect(b.segments.map((s) => s.key)).not.toContain('safe');
    expect(b.total).toBe(aedToFils(9450)); // 5450 + 500 + 300 + 3200
  });
});
