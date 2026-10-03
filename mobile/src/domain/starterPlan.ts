import type { ExpenseItem } from './budgetModel';
import { EXPENSE_CATEGORIES } from './uaeCategories';

/** The core essentials every household has. Everything else is added by the user from the category list. */
export const STARTER_CATEGORY_IDS = [
  'rent',
  'chiller',
  'dewa',
  'internet',
  'health_ins',
  'groceries',
  'transit',
  'medical',
] as const;

/**
 * Start-fresh list: only the core essentials, each at AED 0 so nothing is assumed. The user fills in the amounts,
 * deletes what does not apply, and adds anything else (car loan, school fees, subscriptions, Other...).
 */
export function starterExpenses(): ExpenseItem[] {
  return STARTER_CATEGORY_IDS.flatMap((id) => {
    const c = EXPENSE_CATEGORIES.find((x) => x.id === id);
    if (!c) return [];
    return [
      {
        id: `starter-${id}`,
        name: c.label,
        categoryId: c.id,
        amount: 0,
        frequency: c.kind === 'variable' ? 'monthly' : c.frequency,
        nextDueInDays: 30,
        kind: c.kind,
        essential: c.essential,
        spentSoFar: 0,
      } satisfies ExpenseItem,
    ];
  });
}
