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
    expect(b(0)).toBe(aedToFils(12000));
    expect(b(3)).toBe(aedToFils(12000));
    expect(b(4)).toBe(aedToFils(8500)); // rent 3,500
    expect(b(6)).toBe(aedToFils(8050)); // DEWA 450
    expect(b(8)).toBe(aedToFils(7670)); // internet 380
    expect(b(9)).toBe(aedToFils(6370)); // car loan 1,300
    expect(b(10)).toBe(aedToFils(6120)); // health insurance 250
    expect(b(11)).toBe(aedToFils(4920)); // remittance 1,000 + gym 200
  });

  it('names commitments on their due day', () => {
    expect(tl.days[4]?.dueNames).toEqual(['Rent']);
    expect(tl.days[5]?.dueNames).toEqual([]);
    expect(tl.days[11]?.dueNames).toEqual(['Money sent home', 'Gym membership']);
  });

  it('keeps aside savings + buffer + everyday spending = 1,200 + 300 + 1,650', () => {
    expect(tl.keptAside).toBe(aedToFils(3150));
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

  it('splits the 12,000 available into the five parts and sums to it exactly', () => {
    const byKey = Object.fromEntries(bd.segments.map((s) => [s.key, s.amount]));
    expect(byKey).toEqual({
      commitments: aedToFils(7080),
      savings: aedToFils(1200),
      buffer: aedToFils(300),
      planned: aedToFils(1650),
      safe: aedToFils(1770),
    });
    expect(bd.segments.reduce((sum, s) => sum + s.amount, 0)).toBe(aedToFils(12000));
    expect(bd.total).toBe(aedToFils(12000));
    expect(bd.shortfall).toBe(0);
  });

  it('drops empty segments', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, safetyBuffer: 0, plannedExpenses: 0 });
    expect(buildBreakdown(f).segments.map((s) => s.key)).not.toContain('buffer');
  });

  it('widens the bar to the money spoken for and reports the shortfall', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, plannedExpenses: aedToFils(5000) });
    const b = buildBreakdown(f);
    expect(b.shortfall).toBe(aedToFils(1580));
    expect(b.segments.map((s) => s.key)).not.toContain('safe');
    expect(b.total).toBe(aedToFils(13580)); // 7080 + 1200 + 300 + 5000
  });
});
