import type { Plan } from './budgetModel';
import { incomeSummary } from './incomeInsights';
import type { Fils } from './money';
import type { ForecastResult } from './prototypeForecast';
import { bigBills, emergencyCover, goalProgress } from './savingsInsights';
import { budgetLines, spendingSummary } from './spendingInsights';

/**
 * Plain-language insights derived from the plan (prototype). Structured data only: wording lives in
 * the strings file. Rules are neutral: no blame, no urgency tricks, and every insight can be explained.
 */
export type InsightKind =
  | 'shortfall'
  | 'budget-over'
  | 'budget-ahead'
  | 'big-bill'
  | 'discretionary-tight'
  | 'emergency-low'
  | 'goal-behind'
  | 'income-gap';

export type InsightSeverity = 'attention' | 'heads-up' | 'info';

export interface Insight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  /** Name of the budget, bill or goal the insight is about. */
  subject?: string;
  amount?: Fils;
  days?: number;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = { attention: 0, 'heads-up': 1, info: 2 };
/** A big bill is surfaced when it is due within this many days. */
const BIG_BILL_WINDOW_DAYS = 60;
/** Fewer months of essential cover than this is called out. */
const LOW_COVER_MONTHS = 1;

export function buildInsights(plan: Plan, f: ForecastResult): Insight[] {
  const days = f.horizonDays;
  const out: Insight[] = [];

  if (f.shortfall > 0) {
    out.push({ id: 'shortfall', kind: 'shortfall', severity: 'attention', amount: f.shortfall });
  }

  for (const l of budgetLines(plan, days)) {
    if (l.status === 'over') {
      out.push({
        id: `over-${l.id}`,
        kind: 'budget-over',
        severity: 'attention',
        subject: l.name,
        amount: l.spent - l.budget,
      });
    } else if (l.status === 'ahead') {
      out.push({
        id: `ahead-${l.id}`,
        kind: 'budget-ahead',
        severity: 'heads-up',
        subject: l.name,
        amount: l.remaining,
      });
    }
  }

  for (const b of bigBills(plan)) {
    if (b.dueInDays <= BIG_BILL_WINDOW_DAYS) {
      out.push({
        id: `bill-${b.id}`,
        kind: 'big-bill',
        severity: 'heads-up',
        subject: b.name,
        amount: b.neededPerMonth,
        days: b.dueInDays,
      });
    }
  }

  const spend = spendingSummary(plan, f, days);
  if (f.shortfall === 0 && spend.discretionaryHeadroom < 0) {
    out.push({
      id: 'discretionary-tight',
      kind: 'discretionary-tight',
      severity: 'heads-up',
      amount: -spend.discretionaryHeadroom,
    });
  }

  const cover = emergencyCover(plan);
  if (cover && cover.months < LOW_COVER_MONTHS) {
    out.push({
      id: 'emergency-low',
      kind: 'emergency-low',
      severity: 'heads-up',
      amount: cover.gapToThreeMonths,
    });
  }

  for (const g of plan.goals.map(goalProgress)) {
    if (g.status === 'behind') {
      out.push({
        id: `goal-${g.id}`,
        kind: 'goal-behind',
        severity: 'info',
        subject: g.name,
        amount: g.neededPerMonth ?? 0,
      });
    }
  }

  const income = incomeSummary(plan);
  if (income.stableGapAfterSavings < 0 && income.monthlyVariable > 0) {
    out.push({
      id: 'income-gap',
      kind: 'income-gap',
      severity: 'info',
      amount: -income.stableGapAfterSavings,
    });
  }

  return out.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.amount ?? 0) - (a.amount ?? 0),
  );
}
