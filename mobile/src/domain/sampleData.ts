import type { Commitment, ForecastInput } from './prototypeForecast';
import { aedToFils } from './money';

/** Fictional sample data only. Never put real user data in fixtures. */
export const SAMPLE_COMMITMENTS: readonly Commitment[] = [
  { id: 'rent', name: 'Rent', amount: aedToFils(3500), dueInDays: 4, essential: true },
  { id: 'dewa', name: 'DEWA (utilities)', amount: aedToFils(450), dueInDays: 6, essential: true },
  { id: 'car', name: 'Car loan', amount: aedToFils(1300), dueInDays: 9, essential: true },
  { id: 'gym', name: 'Gym membership', amount: aedToFils(200), dueInDays: 11, essential: false },
  {
    id: 'school',
    name: 'School fees (term)',
    amount: aedToFils(9000),
    dueInDays: 40,
    essential: true,
  },
];

export const SAMPLE_SALARY = aedToFils(15000);
export const SAMPLE_DAYS_UNTIL_PAYDAY = 12;

export const SAMPLE_INPUT: ForecastInput = {
  availableCash: aedToFils(8200),
  expectedIncome: 0,
  daysUntilPayday: SAMPLE_DAYS_UNTIL_PAYDAY,
  commitments: SAMPLE_COMMITMENTS,
  savingsReserve: aedToFils(500),
  safetyBuffer: aedToFils(300),
  plannedExpenses: aedToFils(200),
};

export const SCENARIO_PRESET = {
  label: 'New laptop',
  amount: aedToFils(3000),
} as const;
