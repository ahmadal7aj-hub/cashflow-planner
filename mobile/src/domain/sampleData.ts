import { aedToFils } from './money';
import type { ExpenseItem, IncomeItem, Investment, Plan, SavingsGoal } from './budgetModel';
import { deriveForecastInput, EMPTY_LEDGER } from './budgetModel';
import { getExpenseCategory } from './uaeCategories';

/** Fictional sample data only. Never put real user data in fixtures. */

function fixed(
  id: string,
  categoryId: string,
  name: string,
  aed: number,
  nextDueInDays: number,
  frequency: ExpenseItem['frequency'] = 'monthly',
): ExpenseItem {
  const c = getExpenseCategory(categoryId);
  return {
    id,
    name,
    categoryId,
    amount: aedToFils(aed),
    frequency,
    nextDueInDays,
    kind: 'fixed',
    essential: c.essential,
    spentSoFar: 0,
  };
}

function budget(
  id: string,
  categoryId: string,
  name: string,
  aed: number,
  spent: number,
): ExpenseItem {
  const c = getExpenseCategory(categoryId);
  return {
    id,
    name,
    categoryId,
    amount: aedToFils(aed),
    frequency: 'monthly',
    nextDueInDays: 0,
    kind: 'variable',
    essential: c.essential,
    spentSoFar: aedToFils(spent),
  };
}

export const SAMPLE_INCOME: readonly IncomeItem[] = [
  {
    id: 'salary',
    name: 'Monthly salary',
    kind: 'salary',
    amount: aedToFils(15000),
    frequency: 'monthly',
    nextInDays: 12,
    stable: true,
  },
  {
    id: 'side',
    name: 'Side work',
    kind: 'freelance',
    amount: aedToFils(1500),
    frequency: 'monthly',
    nextInDays: 20,
    stable: false,
  },
  {
    id: 'bonus',
    name: 'Annual bonus',
    kind: 'bonus',
    amount: aedToFils(15000),
    frequency: 'annual',
    nextInDays: 200,
    stable: false,
  },
];

export const SAMPLE_EXPENSES: readonly ExpenseItem[] = [
  fixed('rent', 'rent', 'Rent', 3500, 4),
  fixed('dewa', 'dewa', 'DEWA (utilities)', 450, 6),
  fixed('internet', 'internet', 'Internet and mobile', 380, 8),
  fixed('car', 'car_loan', 'Car loan', 1300, 9),
  fixed('health', 'health_ins', 'Health insurance', 250, 10),
  fixed('remit', 'remittance', 'Money sent home', 1000, 11),
  fixed('gym', 'gym', 'Gym membership', 200, 11),
  fixed('school', 'school', 'School fees (term)', 9000, 40, 'quarterly'),
  fixed('carreg', 'car_cost', 'Car insurance and registration', 2800, 95, 'annual'),
  fixed('visa', 'visa', 'Visa and Emirates ID fees', 1500, 200, 'annual'),
  budget('groceries', 'groceries', 'Groceries', 1800, 650),
  budget('fuel', 'fuel', 'Fuel', 500, 160),
  budget('salik', 'salik', 'Salik', 150, 62),
  budget('parking', 'parking', 'Parking', 120, 48),
  budget('dining', 'dining', 'Dining out', 600, 340),
  budget('delivery', 'delivery', 'Food delivery', 300, 260),
  budget('shopping', 'shopping', 'Shopping', 500, 120),
  budget('entertainment', 'entertainment', 'Entertainment', 250, 275),
];

export const SAMPLE_GOALS: readonly SavingsGoal[] = [
  {
    id: 'emergency',
    name: 'Emergency fund',
    target: aedToFils(45000),
    saved: aedToFils(18000),
    monthlyContribution: aedToFils(500),
    enabled: true,
    purpose: 'emergency',
  },
  {
    id: 'gold',
    name: 'Gold savings',
    target: aedToFils(10000),
    saved: aedToFils(3200),
    monthlyContribution: aedToFils(300),
    enabled: true,
  },
  {
    id: 'travel',
    name: 'Summer travel',
    target: aedToFils(8000),
    saved: aedToFils(2400),
    monthlyContribution: aedToFils(400),
    enabled: true,
    targetInDays: 150,
  },
];

export const SAMPLE_INVESTMENTS: readonly Investment[] = [
  {
    id: 'etf',
    name: 'Global index fund',
    type: 'funds',
    invested: aedToFils(20000),
    currentValue: aedToFils(22400),
    monthlyContribution: 0,
    enabled: true,
    incomeAmount: 0,
    incomeFrequency: 'quarterly',
  },
  {
    id: 'gold',
    name: 'Gold bars',
    type: 'gold',
    invested: aedToFils(8000),
    currentValue: aedToFils(9100),
    monthlyContribution: 0,
    enabled: true,
    incomeAmount: 0,
    incomeFrequency: 'annual',
  },
  {
    id: 'reit',
    name: 'Dubai property fund',
    type: 'real-estate',
    invested: aedToFils(15000),
    currentValue: aedToFils(15600),
    monthlyContribution: 0,
    enabled: true,
    incomeAmount: aedToFils(240),
    incomeFrequency: 'quarterly',
  },
];

export const SAMPLE_PLAN: Plan = {
  setupDone: true,
  investments: SAMPLE_INVESTMENTS,
  savings: EMPTY_LEDGER,
  availableCash: aedToFils(12000),
  safetyBuffer: aedToFils(300),
  income: SAMPLE_INCOME,
  expenses: SAMPLE_EXPENSES,
  retiredIncome: [],
  retiredExpenses: [],
  transactions: [],
  goals: SAMPLE_GOALS,
  employment: { yearsOfService: 4, basicMonthly: aedToFils(9000) },
};

/**
 * Demo plan for Settings > Load sample data: the sample items, an opening savings balance dated `today`, and
 * this month's spending so far as dated transactions (so budgets show spent and remaining amounts).
 */
export function demoPlan(today: string): Plan {
  const transactions = SAMPLE_EXPENSES.filter((e) => e.kind === 'variable' && e.spentSoFar > 0).map(
    (e, i) => ({
      id: `tx-${i + 1}`,
      date: today,
      categoryId: e.categoryId,
      amount: e.spentSoFar,
      note: e.name,
    }),
  );
  return {
    ...SAMPLE_PLAN,
    transactions,
    savings: {
      ...EMPTY_LEDGER,
      opening: { amount: aedToFils(23600), date: today },
      targets: [{ from: today.slice(0, 7), amount: aedToFils(1200) }],
    },
  };
}

/** Fictional last six pay cycles (oldest first). Used for trend charts only. */
export const SAMPLE_HISTORY = {
  spending: [13900, 14300, 15100, 14200, 14900, 14600].map(aedToFils),
  income: [17000, 17500, 16800, 19000, 17400, 17750].map(aedToFils),
  saved: [1500, 900, 600, 1400, 1200, 1200].map(aedToFils),
} as const;
/** Forecast input derived from the sample plan. */
export const SAMPLE_INPUT = deriveForecastInput(SAMPLE_PLAN);

export const SCENARIO_PRESET = {
  label: 'New laptop',
  amount: aedToFils(3000),
} as const;
