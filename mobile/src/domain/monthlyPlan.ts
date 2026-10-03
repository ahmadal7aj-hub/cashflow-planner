import type { Plan } from './budgetModel';
import type { Fils } from './money';
import { monthlyIncome } from './savingsInsights';
import { totalMonthlySpend } from './spendingInsights';

/**
 * The "pay yourself first" split of a typical month: income, then what you set aside, then what is left to spend.
 * Pure; integer fils. Savings = the general monthly amount plus the monthly contributions of enabled goals.
 */
export interface MonthlySplit {
  income: Fils;
  /** The general amount the user chose to save each month (not tied to a goal). */
  generalSavings: Fils;
  /** Monthly contributions of enabled savings goals. */
  goalSavings: Fils;
  /** Monthly contributions to enabled investments. */
  investing: Fils;
  /** income - all set-asides. Can be negative when the plan sets aside more than comes in. */
  leftToSpend: Fils;
  /** Typical monthly spending already entered (bills plus everyday budgets). */
  plannedSpending: Fils;
  /** leftToSpend - plannedSpending. Negative means planned spending is more than what is left. */
  room: Fils;
}

export function monthlySplit(plan: Plan): MonthlySplit {
  const income = monthlyIncome(plan);
  const generalSavings = plan.monthlySavings ?? 0;
  const goalSavings = plan.goals
    .filter((g) => g.enabled)
    .reduce((sum, g) => sum + g.monthlyContribution, 0);
  const investing = plan.investments
    .filter((v) => v.enabled)
    .reduce((sum, v) => sum + v.monthlyContribution, 0);
  const leftToSpend = income - generalSavings - goalSavings - investing;
  const plannedSpending = totalMonthlySpend(plan);
  return {
    income,
    generalSavings,
    goalSavings,
    investing,
    leftToSpend,
    plannedSpending,
    room: leftToSpend - plannedSpending,
  };
}
