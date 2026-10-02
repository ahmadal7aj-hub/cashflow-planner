import { monthlyEquivalent, type Investment, type InvestmentType, type Plan } from './budgetModel';
import type { Fils } from './money';

/**
 * Investment tracking analytics (prototype). Pure, integer fils; ratios are for display only.
 * Tracking only: nothing here is investment advice, and returns are not guaranteed.
 */

export interface InvestmentTypeInfo {
  id: InvestmentType;
  label: string;
  /** What income from this type is usually called, to label the form field. */
  incomeLabel: string;
}

export const INVESTMENT_TYPES: readonly InvestmentTypeInfo[] = [
  { id: 'stocks', label: 'Stocks', incomeLabel: 'Dividends received' },
  { id: 'funds', label: 'Funds and ETFs', incomeLabel: 'Distributions received' },
  { id: 'gold', label: 'Gold and metals', incomeLabel: 'Income received' },
  { id: 'crypto', label: 'Crypto', incomeLabel: 'Income received' },
  { id: 'real-estate', label: 'Real estate', incomeLabel: 'Rent or dividends received' },
  {
    id: 'fixed-income',
    label: 'Sukuk, bonds and deposits',
    incomeLabel: 'Profit or interest received',
  },
  { id: 'business', label: 'Business', incomeLabel: 'Profit share received' },
  { id: 'other', label: 'Other', incomeLabel: 'Income received' },
];

export function getInvestmentType(id: InvestmentType): InvestmentTypeInfo {
  return (
    INVESTMENT_TYPES.find((t) => t.id === id) ?? INVESTMENT_TYPES[INVESTMENT_TYPES.length - 1]!
  );
}

export interface InvestmentLine {
  id: string;
  name: string;
  type: InvestmentType;
  typeLabel: string;
  invested: Fils;
  currentValue: Fils;
  /** currentValue - invested. Negative is a loss. */
  gain: Fils;
  /** gain / invested as a display ratio (0 when nothing is invested). */
  gainRatio: number;
  /** Average monthly income from this investment. */
  monthlyIncome: Fils;
  monthlyContribution: Fils;
  enabled: boolean;
}

export function investmentLine(inv: Investment): InvestmentLine {
  const gain = inv.currentValue - inv.invested;
  return {
    id: inv.id,
    name: inv.name,
    type: inv.type,
    typeLabel: getInvestmentType(inv.type).label,
    invested: inv.invested,
    currentValue: inv.currentValue,
    gain,
    gainRatio: inv.invested > 0 ? gain / inv.invested : 0,
    monthlyIncome: monthlyEquivalent(inv.incomeAmount, inv.incomeFrequency),
    monthlyContribution: inv.monthlyContribution,
    enabled: inv.enabled,
  };
}

/** Average monthly income across all investments (dividends, rent, interest spread over a month). */
export function investmentMonthlyIncome(plan: Plan): Fils {
  return plan.investments.reduce(
    (sum, inv) => sum + monthlyEquivalent(inv.incomeAmount, inv.incomeFrequency),
    0,
  );
}

export interface InvestmentSummary {
  totalInvested: Fils;
  totalValue: Fils;
  /** totalValue - totalInvested. */
  totalGain: Fils;
  gainRatio: number;
  monthlyIncome: Fils;
  /** Planned monthly contributions that are switched on. */
  monthlyContributions: Fils;
  /** Income per year as a share of current value (display ratio). */
  incomeYield: number;
  count: number;
}

export function investmentSummary(plan: Plan): InvestmentSummary {
  const totalInvested = plan.investments.reduce((s, i) => s + i.invested, 0);
  const totalValue = plan.investments.reduce((s, i) => s + i.currentValue, 0);
  const monthlyIncome = investmentMonthlyIncome(plan);
  return {
    totalInvested,
    totalValue,
    totalGain: totalValue - totalInvested,
    gainRatio: totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : 0,
    monthlyIncome,
    monthlyContributions: plan.investments
      .filter((i) => i.enabled)
      .reduce((s, i) => s + i.monthlyContribution, 0),
    incomeYield: totalValue > 0 ? (monthlyIncome * 12) / totalValue : 0,
    count: plan.investments.length,
  };
}

export interface AllocationSlice {
  type: InvestmentType;
  label: string;
  value: Fils;
  /** Share of total current value (0..1). */
  share: number;
}

/** Current value by investment type, largest first. Types with nothing in them are left out. */
export function allocationByType(plan: Plan): AllocationSlice[] {
  const totals = new Map<InvestmentType, Fils>();
  for (const inv of plan.investments) {
    if (inv.currentValue <= 0) continue;
    totals.set(inv.type, (totals.get(inv.type) ?? 0) + inv.currentValue);
  }
  const all = [...totals.values()].reduce((s, v) => s + v, 0);
  return [...totals.entries()]
    .map(([type, value]) => ({
      type,
      label: getInvestmentType(type).label,
      value,
      share: all > 0 ? value / all : 0,
    }))
    .sort((a, b) => b.value - a.value);
}
