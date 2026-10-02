import { monthlyEquivalent, occurrenceDays, type Plan } from './budgetModel';
import type { Fils } from './money';
import { totalMonthlySpend } from './spendingInsights';
import { getIncomeCategory } from './uaeCategories';

/** Pure income analytics (prototype). Integer fils; shares and ratios are display-only. */

export interface IncomeSource {
  id: string;
  name: string;
  kindLabel: string;
  amount: Fils;
  frequency: string;
  /** Average monthly value of this source. */
  monthly: Fils;
  /** Share of total monthly income (0..1). */
  share: number;
  stable: boolean;
  nextInDays: number;
}

/** Income sources sorted by monthly value, largest first. One-off income has no monthly value and is omitted. */
export function incomeBreakdown(plan: Plan): IncomeSource[] {
  const fromIncome = plan.income
    .map((i) => ({
      id: i.id,
      name: i.name,
      kindLabel: getIncomeCategory(i.kind).label,
      amount: i.amount,
      frequency: i.frequency as string,
      monthly: monthlyEquivalent(i.amount, i.frequency),
      stable: i.stable,
      nextInDays: i.nextInDays,
    }))
    .filter((x) => x.monthly > 0);
  // Dividends, rent and interest from investments count as (irregular) income too.
  const fromInvestments = plan.investments
    .map((v) => ({
      id: `investment-${v.id}`,
      name: `${v.name} (income)`,
      kindLabel: 'Investment income',
      amount: v.incomeAmount,
      frequency: v.incomeFrequency as string,
      monthly: monthlyEquivalent(v.incomeAmount, v.incomeFrequency),
      stable: false,
      nextInDays: 0,
    }))
    .filter((x) => x.monthly > 0);
  const all = [...fromIncome, ...fromInvestments];
  const total = all.reduce((s, x) => s + x.monthly, 0);
  return all
    .map((x) => ({ ...x, share: total > 0 ? x.monthly / total : 0 }))
    .sort((a, b) => b.monthly - a.monthly);
}

export interface IncomeSummary {
  monthlyTotal: Fils;
  monthlyStable: Fils;
  monthlyVariable: Fils;
  /** Predictable share of income (0..1). */
  stableShare: number;
  monthlySpend: Fils;
  /** Monthly savings set aside for enabled goals. */
  monthlySaved: Fils;
  /** Predictable income / average monthly spending (display ratio). */
  stableCoverage: number;
  /** Predictable income minus spending minus savings; negative means variable income is needed to cover them. */
  stableGapAfterSavings: Fils;
}

export function incomeSummary(plan: Plan): IncomeSummary {
  const sources = incomeBreakdown(plan);
  const monthlyTotal = sources.reduce((s, i) => s + i.monthly, 0);
  const monthlyStable = sources.filter((i) => i.stable).reduce((s, i) => s + i.monthly, 0);
  const monthlySpend = totalMonthlySpend(plan);
  const monthlySaved = plan.goals
    .filter((g) => g.enabled)
    .reduce((s, g) => s + g.monthlyContribution, 0);
  return {
    monthlyTotal,
    monthlyStable,
    monthlyVariable: monthlyTotal - monthlyStable,
    stableShare: monthlyTotal > 0 ? monthlyStable / monthlyTotal : 0,
    monthlySpend,
    monthlySaved,
    stableCoverage: monthlySpend > 0 ? monthlyStable / monthlySpend : 0,
    stableGapAfterSavings: monthlyStable - monthlySpend - monthlySaved,
  };
}

export interface IncomeEvent {
  id: string;
  name: string;
  amount: Fils;
  inDays: number;
}

/** Money expected to arrive within the next `withinDays` days, soonest first. */
export function upcomingIncome(plan: Plan, withinDays = 60): IncomeEvent[] {
  const events: IncomeEvent[] = [];
  for (const i of plan.income) {
    for (const day of occurrenceDays(i.nextInDays, i.frequency, withinDays + 1)) {
      events.push({ id: `${i.id}-d${day}`, name: i.name, amount: i.amount, inDays: day });
    }
  }
  return events.sort((a, b) => a.inDays - b.inDays || b.amount - a.amount);
}

/** Income minus spending for each historical cycle (can be negative). */
export function netPerCycle(income: readonly Fils[], spending: readonly Fils[]): Fils[] {
  const n = Math.min(income.length, spending.length);
  return Array.from({ length: n }, (_, i) => (income[i] ?? 0) - (spending[i] ?? 0));
}

export interface IncomeRange {
  min: Fils;
  max: Fils;
  average: Fils;
}

export function incomeRange(history: readonly Fils[]): IncomeRange | null {
  if (history.length === 0) return null;
  const sum = history.reduce((s, v) => s + v, 0);
  return {
    min: Math.min(...history),
    max: Math.max(...history),
    average: Math.round(sum / history.length),
  };
}
