import type { Frequency } from './budgetModel';

/** Standard UAE household expense categories (prototype list; labels live here, not in screens). */
export type ExpenseGroup =
  | 'housing'
  | 'bills'
  | 'transport'
  | 'food'
  | 'family'
  | 'health'
  | 'lifestyle'
  | 'finance'
  | 'giving'
  | 'other';

export const EXPENSE_GROUP_LABELS: Record<ExpenseGroup, string> = {
  housing: 'Housing',
  bills: 'Bills and utilities',
  transport: 'Transport and car',
  food: 'Food',
  family: 'Family and education',
  health: 'Health',
  lifestyle: 'Lifestyle',
  finance: 'Loans and cards',
  giving: 'Remittances and giving',
  other: 'Other',
};

export interface ExpenseCategory {
  id: string;
  label: string;
  group: ExpenseGroup;
  /** fixed = a bill with a due day; variable = an everyday budget you spend against. */
  kind: 'fixed' | 'variable';
  essential: boolean;
  frequency: Frequency;
  hint?: string;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  {
    id: 'rent',
    label: 'Rent',
    group: 'housing',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
    hint: 'Paying by post-dated cheques? Add each cheque as a one-off, or choose quarterly or annual.',
  },
  {
    id: 'chiller',
    label: 'Chiller / district cooling',
    group: 'housing',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'dewa',
    label: 'DEWA (electricity and water)',
    group: 'bills',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
    hint: 'Usually higher in the summer months.',
  },
  {
    id: 'internet',
    label: 'Internet and mobile (du / e&)',
    group: 'bills',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'salik',
    label: 'Salik (tolls)',
    group: 'transport',
    kind: 'variable',
    essential: true,
    frequency: 'monthly',
    hint: 'Remember to keep your Salik account topped up.',
  },
  {
    id: 'parking',
    label: 'Parking',
    group: 'transport',
    kind: 'variable',
    essential: true,
    frequency: 'monthly',
    hint: 'Paid parking, Mawaqif and building parking.',
  },
  {
    id: 'fuel',
    label: 'Fuel',
    group: 'transport',
    kind: 'variable',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'car_loan',
    label: 'Car loan',
    group: 'finance',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'car_cost',
    label: 'Car insurance and registration',
    group: 'transport',
    kind: 'fixed',
    essential: true,
    frequency: 'annual',
  },
  {
    id: 'transit',
    label: 'Metro, bus and Nol',
    group: 'transport',
    kind: 'variable',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'taxi',
    label: 'Taxi and ride-hailing',
    group: 'transport',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'groceries',
    label: 'Groceries',
    group: 'food',
    kind: 'variable',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'dining',
    label: 'Dining out',
    group: 'food',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'delivery',
    label: 'Food delivery',
    group: 'food',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'school',
    label: 'School and nursery fees',
    group: 'family',
    kind: 'fixed',
    essential: true,
    frequency: 'quarterly',
    hint: 'School fees are usually paid per term.',
  },
  {
    id: 'childcare',
    label: 'Nanny and childcare',
    group: 'family',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'domestic',
    label: 'Domestic help',
    group: 'family',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'health_ins',
    label: 'Health insurance',
    group: 'health',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'medical',
    label: 'Doctor and pharmacy',
    group: 'health',
    kind: 'variable',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'gym',
    label: 'Gym and fitness',
    group: 'lifestyle',
    kind: 'fixed',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions (streaming, apps)',
    group: 'lifestyle',
    kind: 'fixed',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    group: 'lifestyle',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    group: 'lifestyle',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'travel',
    label: 'Travel and holidays',
    group: 'lifestyle',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'loan',
    label: 'Personal loan',
    group: 'finance',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'credit_card',
    label: 'Credit card payment',
    group: 'finance',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'visa',
    label: 'Visa, Emirates ID and government fees',
    group: 'other',
    kind: 'fixed',
    essential: true,
    frequency: 'annual',
  },
  {
    id: 'remittance',
    label: 'Money sent home',
    group: 'giving',
    kind: 'fixed',
    essential: true,
    frequency: 'monthly',
  },
  {
    id: 'charity',
    label: 'Charity and zakat',
    group: 'giving',
    kind: 'fixed',
    essential: false,
    frequency: 'monthly',
  },
  {
    id: 'other',
    label: 'Other',
    group: 'other',
    kind: 'variable',
    essential: false,
    frequency: 'monthly',
  },
];

export function getExpenseCategory(id: string): ExpenseCategory {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]!
  );
}

export type IncomeKind =
  'salary' | 'allowance' | 'bonus' | 'freelance' | 'rental' | 'investment' | 'other';

export interface IncomeCategory {
  id: IncomeKind;
  label: string;
  /** Salary and allowances are normally predictable; the rest are treated as variable. */
  stable: boolean;
  frequency: Frequency;
}

export const INCOME_CATEGORIES: readonly IncomeCategory[] = [
  { id: 'salary', label: 'Salary', stable: true, frequency: 'monthly' },
  { id: 'allowance', label: 'Allowance (housing, transport)', stable: true, frequency: 'monthly' },
  { id: 'bonus', label: 'Bonus or commission', stable: false, frequency: 'annual' },
  { id: 'freelance', label: 'Freelance or side work', stable: false, frequency: 'monthly' },
  { id: 'rental', label: 'Rental income', stable: true, frequency: 'monthly' },
  { id: 'investment', label: 'Investment income', stable: false, frequency: 'quarterly' },
  { id: 'other', label: 'Other income', stable: false, frequency: 'monthly' },
];

export function getIncomeCategory(id: IncomeKind): IncomeCategory {
  return (
    INCOME_CATEGORIES.find((c) => c.id === id) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1]!
  );
}
