import {
  monthlyEquivalent,
  type Employment,
  type ExpenseItem,
  type Plan,
  type SavingsGoal,
} from './budgetModel';
import { investmentMonthlyIncome } from './investmentInsights';
import type { Fils } from './money';
import { totalMonthlySpend } from './spendingInsights';

/** Pure savings analytics (prototype). Integer fils; ratios are for display only. */

const DAYS_PER_MONTH = 30;

export type GoalStatus = 'done' | 'on-track' | 'behind' | 'no-deadline' | 'paused';

export interface GoalProgress {
  id: string;
  name: string;
  target: Fils;
  saved: Fils;
  remaining: Fils;
  /** saved / target, capped at 1. */
  pct: number;
  monthly: Fils;
  /** Whole months to finish at the current monthly amount; null if nothing is set aside. */
  monthsToGo: number | null;
  status: GoalStatus;
  /** With a deadline: the monthly amount needed to finish on time. */
  neededPerMonth: Fils | null;
  targetInDays: number | null;
  emergency: boolean;
}

export function goalProgress(goal: SavingsGoal): GoalProgress {
  const remaining = Math.max(0, goal.target - goal.saved);
  const monthly = goal.monthlyContribution;
  const hasDeadline = goal.targetInDays !== undefined;
  const neededPerMonth =
    hasDeadline && remaining > 0
      ? // Under a month to go, everything is needed within the month, not an inflated monthly rate.
        Math.ceil(remaining / Math.max(1, (goal.targetInDays ?? 0) / DAYS_PER_MONTH))
      : null;

  let status: GoalStatus;
  if (remaining === 0) status = 'done';
  else if (!goal.enabled) status = 'paused';
  else if (neededPerMonth !== null) status = monthly >= neededPerMonth ? 'on-track' : 'behind';
  else status = 'no-deadline';

  return {
    id: goal.id,
    name: goal.name,
    target: goal.target,
    saved: goal.saved,
    remaining,
    pct: goal.target > 0 ? Math.min(1, goal.saved / goal.target) : 0,
    monthly,
    monthsToGo: remaining === 0 ? 0 : monthly > 0 ? Math.ceil(remaining / monthly) : null,
    status,
    neededPerMonth,
    targetInDays: goal.targetInDays ?? null,
    emergency: goal.purpose === 'emergency',
  };
}

/** Average monthly cost of the things you cannot skip: essential bills plus essential budgets. */
export function essentialMonthlySpend(plan: Plan): Fils {
  return plan.expenses
    .filter((e) => e.essential)
    .reduce(
      (sum, e) =>
        sum + (e.kind === 'variable' ? e.amount : monthlyEquivalent(e.amount, e.frequency)),
      0,
    );
}

export type CoverLevel = 'none' | 'low' | 'building' | 'solid';

export interface EmergencyCover {
  saved: Fils;
  essentialMonthly: Fils;
  /** Months of essential spending the fund covers (display ratio). */
  months: number;
  /** Amount for three months of essentials, a common minimum rule of thumb. */
  threeMonthTarget: Fils;
  gapToThreeMonths: Fils;
  level: CoverLevel;
}

export function emergencyCover(plan: Plan): EmergencyCover | null {
  const fund = plan.goals.find((g) => g.purpose === 'emergency');
  if (!fund) return null;
  const essentialMonthly = essentialMonthlySpend(plan);
  const months = essentialMonthly > 0 ? fund.saved / essentialMonthly : 0;
  const threeMonthTarget = essentialMonthly * 3;
  return {
    saved: fund.saved,
    essentialMonthly,
    months,
    threeMonthTarget,
    gapToThreeMonths: Math.max(0, threeMonthTarget - fund.saved),
    level: fund.saved === 0 ? 'none' : months < 1 ? 'low' : months < 3 ? 'building' : 'solid',
  };
}

/** Average monthly income from every source, including dividends, rent and interest from investments. */
export function monthlyIncome(plan: Plan): Fils {
  return (
    plan.income.reduce((sum, i) => sum + monthlyEquivalent(i.amount, i.frequency), 0) +
    investmentMonthlyIncome(plan)
  );
}

export interface SavingsSummary {
  monthlyIncome: Fils;
  monthlySaved: Fils;
  /** monthlySaved / monthlyIncome as a display ratio. */
  savingsRate: number;
  totalSaved: Fils;
  /** Income minus average monthly spending minus savings. Negative means spending is outrunning income. */
  unallocatedMonthly: Fils;
}

export function savingsSummary(plan: Plan): SavingsSummary {
  const income = monthlyIncome(plan);
  // Money set aside each month: savings goals plus planned investment contributions.
  const monthlySaved =
    plan.goals.filter((g) => g.enabled).reduce((s, g) => s + g.monthlyContribution, 0) +
    plan.investments.filter((v) => v.enabled).reduce((s, v) => s + v.monthlyContribution, 0);
  return {
    monthlyIncome: income,
    monthlySaved,
    savingsRate: income > 0 ? monthlySaved / income : 0,
    totalSaved: plan.goals.reduce((s, g) => s + g.saved, 0),
    unallocatedMonthly: income - totalMonthlySpend(plan) - monthlySaved,
  };
}

export interface BigBill {
  id: string;
  name: string;
  amount: Fils;
  dueInDays: number;
  /** Whole months you have to prepare (at least 1). */
  monthsToPrepare: number;
  /** Amount to set aside each month, starting now, to be ready on the due date. */
  neededPerMonth: Fils;
}

const BIG_BILL_FREQUENCIES: readonly ExpenseItem['frequency'][] = ['quarterly', 'annual', 'once'];

/** Non-monthly fixed bills (school terms, car registration, visa fees...) due within a year, soonest first. */
export function bigBills(plan: Plan): BigBill[] {
  return plan.expenses
    .filter(
      (e) =>
        e.kind === 'fixed' &&
        BIG_BILL_FREQUENCIES.includes(e.frequency) &&
        e.nextDueInDays >= 0 &&
        e.nextDueInDays <= 365,
    )
    .map((e) => {
      const monthsToPrepare = Math.max(1, Math.ceil(e.nextDueInDays / DAYS_PER_MONTH));
      return {
        id: e.id,
        name: e.name,
        amount: e.amount,
        dueInDays: e.nextDueInDays,
        monthsToPrepare,
        neededPerMonth: Math.ceil(e.amount / monthsToPrepare),
      };
    })
    .sort((a, b) => a.dueInDays - b.dueInDays);
}

/**
 * ILLUSTRATIVE end-of-service gratuity: 21 days of basic wage per year for the first five years and
 * 30 days per year after that, capped at two years of basic wage; nothing under one year of service.
 * This is a rough guide only. Contracts, free-zone rules and legal changes can differ, so the person
 * should confirm with their employer or the labour authority.
 */
export function gratuityEstimate(emp: Employment): Fils {
  if (emp.yearsOfService < 1 || emp.basicMonthly <= 0) return 0;
  const firstYears = Math.min(emp.yearsOfService, 5);
  const laterYears = Math.max(0, emp.yearsOfService - 5);
  const days = firstYears * 21 + laterYears * 30;
  const raw = Math.round((days * emp.basicMonthly) / DAYS_PER_MONTH);
  return Math.min(raw, emp.basicMonthly * 24);
}
