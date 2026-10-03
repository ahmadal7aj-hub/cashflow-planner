import {
  nextId,
  type ExpenseItem,
  type IncomeItem,
  type Plan,
  type SavingsMovement,
  type Transaction,
} from './budgetModel';
import type { ISODate } from './dates';
import type { Fils } from './money';
import { monthOf, type MonthKey } from './months';
import { balanceAsOf, maintainSavings } from './savingsEngine';
import { retire, startVersioned, withAmountChange } from './versioned';

/**
 * Pure edits to the plan. Every edit keeps history: amounts are effective-dated, deleted items move to a retired
 * list, and deleting a budget or bill never touches past transactions. Each edit ends by bringing the savings
 * records up to date, so a finished month is closed exactly once.
 */

function finish(plan: Plan, today: ISODate): Plan {
  return maintainSavings(plan, today);
}

function upsertVersioned<T extends { id: string; amount: Fils } & import('./versioned').Versioned>(
  list: readonly T[],
  incoming: T,
  month: MonthKey,
): T[] {
  const existing = list.find((x) => x.id === incoming.id);
  if (!existing) return [...list, startVersioned(incoming, month)];
  const merged = {
    ...existing,
    ...incoming,
    amount: existing.amount,
    startMonth: existing.startMonth,
    amountHistory: existing.amountHistory,
  } as T;
  const next = withAmountChange(merged, incoming.amount, month);
  return list.map((x) => (x.id === incoming.id ? next : x));
}

export function upsertIncomeItem(plan: Plan, item: IncomeItem, today: ISODate): Plan {
  return finish({ ...plan, income: upsertVersioned(plan.income, item, monthOf(today)) }, today);
}

export function upsertExpenseItem(plan: Plan, item: ExpenseItem, today: ISODate): Plan {
  return finish({ ...plan, expenses: upsertVersioned(plan.expenses, item, monthOf(today)) }, today);
}

/** Deleting ends the item from this month; earlier months keep reporting it. */
export function removeIncomeItem(plan: Plan, id: string, today: ISODate): Plan {
  const item = plan.income.find((i) => i.id === id);
  if (!item) return plan;
  return finish(
    {
      ...plan,
      income: plan.income.filter((i) => i.id !== id),
      retiredIncome: [...plan.retiredIncome, retire(item, monthOf(today))],
    },
    today,
  );
}

export function removeExpenseItem(plan: Plan, id: string, today: ISODate): Plan {
  const item = plan.expenses.find((e) => e.id === id);
  if (!item) return plan;
  return finish(
    {
      ...plan,
      expenses: plan.expenses.filter((e) => e.id !== id),
      retiredExpenses: [...plan.retiredExpenses, retire(item, monthOf(today))],
    },
    today,
  );
}

export function addTransaction(plan: Plan, t: Omit<Transaction, 'id'>, today: ISODate): Plan {
  const id = nextId('tx', plan.transactions);
  return finish({ ...plan, transactions: [...plan.transactions, { ...t, id }] }, today);
}

export function updateTransaction(plan: Plan, t: Transaction, today: ISODate): Plan {
  return finish(
    { ...plan, transactions: plan.transactions.map((x) => (x.id === t.id ? t : x)) },
    today,
  );
}

export function removeTransaction(plan: Plan, id: string, today: ISODate): Plan {
  return finish({ ...plan, transactions: plan.transactions.filter((t) => t.id !== id) }, today);
}

/** Mark one occurrence of a bill as paid. Creates one actual transaction; a second call changes nothing. */
export function markBillPaid(
  plan: Plan,
  billId: string,
  due: ISODate,
  paidOn: ISODate,
  today: ISODate,
): Plan {
  const bill = plan.expenses.find((e) => e.id === billId);
  if (!bill || plan.transactions.some((t) => t.billId === billId && t.billDue === due)) return plan;
  return addTransaction(
    plan,
    {
      date: paidOn,
      categoryId: bill.categoryId,
      amount: bill.amount,
      note: bill.name,
      billId,
      billDue: due,
    },
    today,
  );
}

export type SavingsResult = { ok: true; plan: Plan } | { ok: false; reason: string };

function withMovement(plan: Plan, movement: Omit<SavingsMovement, 'id'>, today: ISODate): Plan {
  const id = nextId('mv', plan.savings.movements);
  return finish(
    {
      ...plan,
      savings: { ...plan.savings, movements: [...plan.savings.movements, { ...movement, id }] },
    },
    today,
  );
}

/** Set (or change) the existing savings balance and the date it applies from. Zero is allowed. */
export function setOpeningSavings(plan: Plan, amount: Fils, date: ISODate, today: ISODate): Plan {
  return finish({ ...plan, savings: { ...plan.savings, opening: { amount, date } } }, today);
}

/** Set the monthly savings target from the current month onwards. Zero is allowed. */
export function setSavingsTarget(plan: Plan, amount: Fils, today: ISODate): Plan {
  const month = monthOf(today);
  const kept = plan.savings.targets.filter((t) => t.from < month);
  return finish(
    { ...plan, savings: { ...plan.savings, targets: [...kept, { from: month, amount }] } },
    today,
  );
}

export function addSavings(
  plan: Plan,
  amount: Fils,
  date: ISODate,
  note: string,
  today: ISODate,
): SavingsResult {
  if (!(amount > 0)) return { ok: false, reason: 'amount' };
  if (!plan.savings.opening) return { ok: false, reason: 'no-opening' };
  if (date < plan.savings.opening.date) return { ok: false, reason: 'before-opening' };
  return {
    ok: true,
    plan: withMovement(plan, { date, kind: 'deposit', change: amount, note: note.trim() }, today),
  };
}

export function withdrawSavings(
  plan: Plan,
  amount: Fils,
  date: ISODate,
  note: string,
  today: ISODate,
): SavingsResult {
  if (!(amount > 0)) return { ok: false, reason: 'amount' };
  if (!plan.savings.opening) return { ok: false, reason: 'no-opening' };
  if (date < plan.savings.opening.date) return { ok: false, reason: 'before-opening' };
  const balance = balanceAsOf(plan.savings, today) ?? 0;
  if (amount > balance) return { ok: false, reason: 'insufficient' };
  return {
    ok: true,
    plan: withMovement(
      plan,
      { date, kind: 'withdrawal', change: -amount, note: note.trim() },
      today,
    ),
  };
}

/** Deleting a manual savings movement. Month-end results and corrections cannot be deleted. */
export function removeSavingsMovement(plan: Plan, id: string, today: ISODate): Plan {
  const m = plan.savings.movements.find((x) => x.id === id);
  if (!m || (m.kind !== 'deposit' && m.kind !== 'withdrawal')) return plan;
  return finish(
    {
      ...plan,
      savings: { ...plan.savings, movements: plan.savings.movements.filter((x) => x.id !== id) },
    },
    today,
  );
}
