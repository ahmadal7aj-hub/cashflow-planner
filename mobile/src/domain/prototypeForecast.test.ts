import { aedToFils } from './money';
import { CALCULATION_VERSION, computeForecast, type ForecastInput } from './prototypeForecast';
import { SAMPLE_INPUT } from './sampleData';

const base: ForecastInput = {
  availableCash: aedToFils(1000),
  expectedIncome: 0,
  daysUntilPayday: 10,
  commitments: [],
  savingsReserve: 0,
  safetyBuffer: 0,
  plannedExpenses: 0,
};

describe('computeForecast: sample data (hand-calculated fixture)', () => {
  const f = computeForecast(SAMPLE_INPUT);

  it('reserves only commitments due inside the 12-day horizon', () => {
    // 3500 + 450 + 1300 + 200 = 5450; school fees (day 40) are outside.
    expect(f.reservedCommitments).toBe(aedToFils(5450));
    expect(f.upcoming.map((c) => c.id)).toEqual(['rent', 'dewa', 'car', 'gym']);
  });

  it('safe-to-spend = 8200 - 5450 - 500 - 300 - 200 = 1750', () => {
    expect(f.rawSafeToSpend).toBe(aedToFils(1750));
    expect(f.safeToSpend).toBe(aedToFils(1750));
    expect(f.shortfall).toBe(0);
  });

  it('daily safe amount floors to whole fils: 175000 / 12 = 14583', () => {
    expect(f.dailySafe).toBe(14583);
  });

  it('forecast balance excludes the safety buffer: 8200 - 5450 - 200 - 500 = 2050', () => {
    expect(f.forecastBalance).toBe(aedToFils(2050));
  });

  it('flags only rent as due soon', () => {
    expect(f.warnings.map((w) => w.id)).toEqual(['due-rent']);
  });

  it('records the calculation version', () => {
    expect(f.calculationVersion).toBe(CALCULATION_VERSION);
  });
});

describe('computeForecast: edge cases (PRD section 9)', () => {
  it('never shows a negative allowance; reports shortfall separately', () => {
    const f = computeForecast({ ...base, plannedExpenses: aedToFils(1250) });
    expect(f.rawSafeToSpend).toBe(-aedToFils(250));
    expect(f.safeToSpend).toBe(0);
    expect(f.shortfall).toBe(aedToFils(250));
    expect(f.dailySafe).toBe(0);
    expect(f.warnings[0]).toMatchObject({ kind: 'shortfall', severity: 'high' });
  });

  it('handles a commitment larger than the balance', () => {
    const f = computeForecast({
      ...base,
      commitments: [{ id: 'x', name: 'X', amount: aedToFils(5000), dueInDays: 2, essential: true }],
    });
    expect(f.safeToSpend).toBe(0);
    expect(f.shortfall).toBe(aedToFils(4000));
  });

  it('handles zero income and zero everything without NaN', () => {
    const f = computeForecast({ ...base, availableCash: 0 });
    for (const n of [f.safeToSpend, f.dailySafe, f.forecastBalance, f.shortfall]) {
      expect(Number.isFinite(n)).toBe(true);
    }
    expect(f.safeToSpend).toBe(0);
  });

  it('treats payday today (0 days) as a 1-day horizon, never dividing by zero', () => {
    const f = computeForecast({ ...base, daysUntilPayday: 0 });
    expect(f.horizonDays).toBe(1);
    expect(f.dailySafe).toBe(aedToFils(1000));
  });

  it('counts a commitment due today but not one due on payday', () => {
    const commitments = [
      { id: 'today', name: 'Today', amount: 100, dueInDays: 0, essential: true },
      { id: 'payday', name: 'Payday', amount: 200, dueInDays: 10, essential: true },
      { id: 'past', name: 'Past', amount: 400, dueInDays: -1, essential: true },
    ];
    const f = computeForecast({ ...base, commitments });
    expect(f.reservedCommitments).toBe(100);
  });

  it('warns when what is left is below the safety buffer', () => {
    const f = computeForecast({
      ...base,
      safetyBuffer: aedToFils(300),
      plannedExpenses: aedToFils(800),
    });
    // raw = 1000 - 300 - 800 = -100 -> shortfall takes priority over tight-buffer.
    expect(f.warnings[0]?.kind).toBe('shortfall');
    const tight = computeForecast({
      ...base,
      safetyBuffer: aedToFils(300),
      plannedExpenses: aedToFils(600),
    });
    expect(tight.safeToSpend).toBe(aedToFils(100));
    expect(tight.warnings[0]?.kind).toBe('tight-buffer');
  });

  it('includes expected income inside the horizon', () => {
    const f = computeForecast({ ...base, expectedIncome: aedToFils(500) });
    expect(f.safeToSpend).toBe(aedToFils(1500));
  });

  it('is deterministic and does not mutate its input', () => {
    const before = JSON.stringify(SAMPLE_INPUT);
    const a = computeForecast(SAMPLE_INPUT);
    const b = computeForecast(SAMPLE_INPUT);
    expect(a).toEqual(b);
    expect(JSON.stringify(SAMPLE_INPUT)).toBe(before);
  });

  it('keeps every figure an integer number of fils', () => {
    const f = computeForecast({ ...SAMPLE_INPUT, daysUntilPayday: 7 });
    for (const n of [f.safeToSpend, f.dailySafe, f.forecastBalance]) {
      expect(Number.isInteger(n)).toBe(true);
    }
  });
});
