import type { Fils } from './money';
import type { MonthKey } from './months';

/**
 * Effective-dated amounts, so history is never rewritten. Editing an amount applies from the current month
 * onwards; deleting an item ends it from the current month. Earlier months keep what they were.
 */
export interface AmountChange {
  from: MonthKey;
  amount: Fils;
}

export interface Versioned {
  /** First month the item applies to. Missing means "always" (sample or legacy items). */
  startMonth?: MonthKey;
  /** Every amount the item has had, oldest first. The last entry equals the current `amount`. */
  amountHistory?: AmountChange[];
  /** The first month the item no longer applies to (it was deleted during the month before). */
  deletedFrom?: MonthKey;
}

export function isActiveIn(item: Versioned, month: MonthKey): boolean {
  if (item.startMonth !== undefined && month < item.startMonth) return false;
  if (item.deletedFrom !== undefined && month >= item.deletedFrom) return false;
  return true;
}

/** The amount that applied in `month`. Falls back to the current amount for items without history. */
export function amountInMonth(item: Versioned & { amount: Fils }, month: MonthKey): Fils {
  const history = item.amountHistory;
  if (!history || history.length === 0) return item.amount;
  let found: Fils | undefined;
  for (const h of history) if (h.from <= month) found = h.amount;
  return found ?? history[0]!.amount;
}

/** Record a new amount from `month` onwards. Earlier months are untouched. */
export function withAmountChange<T extends Versioned & { amount: Fils }>(
  item: T,
  newAmount: Fils,
  month: MonthKey,
): T {
  if (newAmount === item.amount) return item;
  const base: AmountChange[] = item.amountHistory ?? [
    { from: item.startMonth ?? '0000-01', amount: item.amount },
  ];
  const kept = base.filter((h) => h.from < month);
  return {
    ...item,
    amount: newAmount,
    amountHistory: [...kept, { from: month, amount: newAmount }],
  };
}

/** Start a brand-new item in `month` with its first amount. */
export function startVersioned<T extends { amount: Fils }>(
  item: T,
  month: MonthKey,
): T & Versioned {
  return { ...item, startMonth: month, amountHistory: [{ from: month, amount: item.amount }] };
}

export function retire<T extends Versioned>(item: T, month: MonthKey): T {
  return { ...item, deletedFrom: month };
}
