import {
  daysUntilPayday,
  nextId,
  type Plan,
  type SavingsAccount,
  type SavingsEntry,
  type SavingsEntryKind,
} from './budgetModel';
import { addDays, type ISODate } from './dates';
import type { Fils } from './money';
import { monthlyIncome } from './savingsInsights';
import { totalMonthlySpend } from './spendingInsights';

/**
 * Current savings balance (prototype). Pure functions over a SavingsAccount; integer fils.
 * The balance goes up when you add money or when a pay cycle ends with income left over, and goes down when
 * you take money out or when you spent more than you earned.
 */

function record(
  account: SavingsAccount,
  kind: SavingsEntryKind,
  change: Fils,
  date: ISODate,
  note: string,
): SavingsAccount {
  const balance = account.balance + change;
  const entry: SavingsEntry = {
    id: nextId('sv', account.entries),
    kind,
    change,
    balanceAfter: balance,
    date,
    note: note.trim(),
  };
  return { ...account, balance, entries: [entry, ...account.entries] };
}

/** Add money to savings. The amount must be positive. */
export function deposit(
  account: SavingsAccount,
  amount: Fils,
  date: ISODate,
  note = '',
): SavingsAccount {
  if (!(amount > 0)) throw new RangeError('A deposit must be more than zero.');
  return record(account, 'deposit', amount, date, note);
}

export type WithdrawResult =
  { ok: true; account: SavingsAccount } | { ok: false; reason: 'insufficient' | 'invalid' };

/** Take money out of savings. You cannot take out more than you have saved. */
export function withdraw(
  account: SavingsAccount,
  amount: Fils,
  date: ISODate,
  note = '',
): WithdrawResult {
  if (!(amount > 0)) return { ok: false, reason: 'invalid' };
  if (amount > account.balance) return { ok: false, reason: 'insufficient' };
  return { ok: true, account: record(account, 'withdrawal', -amount, date, note) };
}

export interface CycleResult {
  /** Average monthly income (yearly and irregular income spread out). */
  income: Fils;
  /** Average monthly spending: bills at their monthly equivalent plus everyday budgets. */
  spending: Fils;
  /** income - spending. Positive adds to savings; negative reduces it. */
  result: Fils;
}

/**
 * An estimate of how a pay cycle ends: typical monthly income minus typical monthly spending. Money you
 * already set aside for goals is a transfer inside your savings, so it is not counted as spending.
 * The real app will use your actual transactions instead.
 */
export function cycleResult(plan: Plan): CycleResult {
  const income = monthlyIncome(plan);
  const spending = totalMonthlySpend(plan);
  return { income, spending, result: income - spending };
}

/** Identifies the current pay cycle by the date its next payday falls on. */
export function cycleKey(plan: Plan, today: ISODate): ISODate {
  return addDays(today, daysUntilPayday(plan));
}

export function canCloseCycle(plan: Plan, today: ISODate): boolean {
  return plan.savings.lastClosedCycle !== cycleKey(plan, today);
}

/** Add this cycle's result to savings. Does nothing (returns null) if the cycle was already added. */
export function closeCycle(plan: Plan, today: ISODate): SavingsAccount | null {
  if (!canCloseCycle(plan, today)) return null;
  const { result } = cycleResult(plan);
  const next = record(plan.savings, 'cycle', result, today, '');
  return { ...next, lastClosedCycle: cycleKey(plan, today) };
}
