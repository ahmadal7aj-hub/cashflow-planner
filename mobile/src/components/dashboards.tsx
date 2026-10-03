import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text } from 'react-native';

import {
  incomeByMonth,
  incomeBySource,
  rangeElapsed,
  savingsByMonth,
  spendingByMonth,
} from '../domain/dashboardCharts';
import { coversWholeMonths, type DashboardSummary } from '../domain/dashboardRange';
import { formatDate } from '../domain/dates';
import { formatAed } from '../domain/money';
import { paceStatus } from '../domain/spendingInsights';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';
import { makeStyles } from '../theme/ThemeProvider';
import { fontSize } from '../theme/tokens';
import { BudgetBar, HorizontalBars, TrendBars } from './dashboardParts';
import { Body, Button, Card, Heading, Row } from './ui';

const useStyles = makeStyles(({ colors }) => ({
  big: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
}));

const d = t.dashboards;

function signed(fils: number): string {
  return fils > 0 ? `+${formatAed(fils)}` : formatAed(fils);
}

/** The first and last month of a monthly chart, and one sentence that says what the chart shows. */
function trendText(
  months: readonly { label: string; value: number }[],
  what: string,
): { first: string; last: string; summary: string } {
  const first = months[0]?.label ?? '';
  const last = months[months.length - 1]?.label ?? '';
  const parts = months.map((m) => `${m.label}: ${formatAed(m.value)}`).join('; ');
  return { first, last, summary: `${what}. ${parts}` };
}

interface SectionProps {
  summary: DashboardSummary;
}

/** Income received and still expected, by month and by source. */
export function IncomeDashboard({ summary: s }: SectionProps) {
  const { plan, today } = usePrototype();
  const range = { from: s.from, to: s.to };
  const sources = useMemo(() => incomeBySource(plan, range, today), [plan, s.from, s.to, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const months = useMemo(() => incomeByMonth(plan, range, today), [plan, s.from, s.to, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const tt = trendText(months, d.income.trendTitle);
  return (
    <>
      <Card testID="income-dashboard">
        <Heading>{d.income.title}</Heading>
        <Row label={t.dashboardPage.received} value={formatAed(s.income.received)} strong />
        <Row label={t.dashboardPage.expected} value={formatAed(s.income.expected)} />
      </Card>
      {sources.length === 0 ? (
        <Body muted testID="income-dashboard-empty">
          {d.income.none}
        </Body>
      ) : (
        <>
          <TrendBars
            testID="income-trend"
            title={d.income.trendTitle}
            caption={d.income.trendCaption}
            values={months.map((m) => m.value)}
            firstLabel={tt.first}
            lastLabel={tt.last}
            summary={tt.summary}
          />
          <HorizontalBars
            testID="income-sources"
            title={d.income.sourcesTitle}
            caption={d.income.sourcesCaption}
            items={sources.map((x) => ({
              key: x.id,
              label: x.name,
              value: x.received + x.expected,
            }))}
          />
        </>
      )}
    </>
  );
}

/** Budget by category and how each budget is being used. */
export function BudgetDashboard({ summary: s }: SectionProps) {
  const router = useRouter();
  const { today } = usePrototype();
  const sp = s.spending;
  const elapsed = rangeElapsed({ from: s.from, to: s.to }, today);
  const budgeted = sp.rows.filter((r) => r.budget > 0);
  return (
    <>
      <Card testID="budget-dashboard">
        <Heading>{d.budget.title}</Heading>
        <Row label={t.dashboardPage.budget} value={formatAed(sp.totalBudget)} strong />
        <Row label={t.dashboardPage.spent} value={formatAed(sp.totalActual)} />
        <Row
          label={sp.totalRemaining < 0 ? t.dashboardPage.overBy : t.dashboardPage.remaining}
          value={formatAed(Math.abs(sp.totalRemaining))}
        />
        {!coversWholeMonths({ from: s.from, to: s.to }) ? (
          <Body muted>{t.dashboardPage.prorated}</Body>
        ) : null}
      </Card>
      {budgeted.length === 0 ? (
        <Body muted testID="budget-dashboard-empty">
          {t.dashboardPage.budgetsNone}
        </Body>
      ) : (
        <>
          <HorizontalBars
            testID="budget-by-category"
            title={d.budget.byCategory}
            caption={d.budget.byCategoryCaption}
            items={budgeted.map((r) => ({ key: r.categoryId, label: r.label, value: r.budget }))}
          />
          <Card testID="budget-usage">
            <Heading>{d.budget.usage}</Heading>
            <Body muted>{d.budget.usageCaption}</Body>
            {budgeted.map((r) => (
              <BudgetBar
                key={r.categoryId}
                name={r.label}
                spent={r.actual}
                budget={r.budget}
                elapsed={elapsed}
                status={paceStatus(r.actual, r.budget, elapsed)}
              />
            ))}
          </Card>
        </>
      )}
      <Button
        label={t.dashboardPage.openBudget}
        variant="secondary"
        onPress={() => router.navigate('/budget')}
        testID="dash-open-budget"
      />
    </>
  );
}

/** Actual spending by month and by category. */
export function SpendingDashboard({ summary: s }: SectionProps) {
  const router = useRouter();
  const { plan } = usePrototype();
  const sp = s.spending;
  const months = useMemo(
    () => spendingByMonth(plan, { from: s.from, to: s.to }),
    [plan, s.from, s.to],
  );
  const spentRows = sp.rows.filter((r) => r.actual > 0).sort((a, b) => b.actual - a.actual);
  const tt = trendText(months, d.spending.trendTitle);
  return (
    <>
      <Card tone={sp.totalRemaining < 0 ? 'danger' : 'default'} testID="spending-dashboard">
        <Heading>{d.spending.title}</Heading>
        <Row label={t.dashboardPage.spent} value={formatAed(sp.totalActual)} strong />
        <Row label={t.dashboardPage.budget} value={formatAed(sp.totalBudget)} />
        <Row
          label={sp.totalRemaining < 0 ? t.dashboardPage.overBy : t.dashboardPage.remaining}
          value={formatAed(Math.abs(sp.totalRemaining))}
        />
        {sp.unbudgetedActual > 0 ? (
          <Body muted>{t.dashboardPage.unbudgeted(formatAed(sp.unbudgetedActual))}</Body>
        ) : null}
      </Card>
      {spentRows.length === 0 ? (
        <Body muted testID="spending-dashboard-empty">
          {d.spending.none}
        </Body>
      ) : (
        <>
          <TrendBars
            testID="spending-trend"
            title={d.spending.trendTitle}
            caption={d.spending.trendCaption}
            values={months.map((m) => m.value)}
            firstLabel={tt.first}
            lastLabel={tt.last}
            summary={tt.summary}
          />
          <HorizontalBars
            testID="spending-by-category"
            title={d.spending.byCategory}
            caption={d.spending.byCategoryCaption}
            items={spentRows.map((r) => ({ key: r.categoryId, label: r.label, value: r.actual }))}
          />
        </>
      )}
      <Button
        label={t.dashboardPage.openSpending}
        variant="secondary"
        onPress={() => router.navigate('/spending')}
        testID="dash-open-spending"
      />
    </>
  );
}

/** Savings added each month, the period total and the balance. */
export function SavingsDashboard({ summary: s }: SectionProps) {
  const styles = useStyles();
  const router = useRouter();
  const { plan, today } = usePrototype();
  const months = useMemo(
    () => savingsByMonth(plan, { from: s.from, to: s.to }, today),
    [plan, s.from, s.to, today],
  );
  const tt = trendText(months, d.savings.trendTitle);
  const hasMoney = months.some((m) => m.value !== 0);
  return (
    <>
      <Card tone="info" testID="savings-dashboard">
        <Heading>{d.savings.title}</Heading>
        <Body muted>{d.savings.periodLabel}</Body>
        <Text style={styles.big} testID="savings-dashboard-period">
          {signed(s.savings.period)}
        </Text>
        <Body muted>{t.dashboardPage.periodNote}</Body>
        {s.savings.total === null ? (
          <Body testID="savings-dashboard-unknown">{t.dashboardPage.totalUnknown}</Body>
        ) : (
          <>
            <Body muted>{d.savings.totalLabel}</Body>
            <Text style={styles.big} testID="savings-dashboard-total">
              {formatAed(s.savings.total)}
            </Text>
            <Body muted>{t.dashboardPage.totalNote(formatDate(s.savings.totalAsOf))}</Body>
          </>
        )}
      </Card>
      {hasMoney ? (
        <TrendBars
          testID="savings-trend"
          title={d.savings.trendTitle}
          caption={d.savings.trendCaption}
          values={months.map((m) => m.value)}
          firstLabel={tt.first}
          lastLabel={tt.last}
          summary={tt.summary}
        />
      ) : (
        <Body muted testID="savings-dashboard-empty">
          {d.savings.none}
        </Body>
      )}
      <Button
        label={d.savings.open}
        variant="secondary"
        onPress={() => router.navigate('/savings')}
        testID="dash-open-savings"
      />
    </>
  );
}
