import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text } from 'react-native';

import {
  balanceByMonth,
  incomeByMonth,
  incomeBySource,
  rangeElapsed,
  savingsByMonth,
  shortMonth,
  spendingByMonth,
  type MonthValue,
} from '../domain/dashboardCharts';
import { coversWholeMonths, type DashboardSummary } from '../domain/dashboardRange';
import { formatDate, type ISODate } from '../domain/dates';
import { formatAed } from '../domain/money';
import { paceStatus } from '../domain/spendingInsights';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { fontSize } from '../theme/tokens';
import { CompareColumns, GroupedColumns, Meter, MonthColumns } from './chartKit';
import { BudgetBar, HorizontalBars } from './dashboardParts';
import { Body, Button, Card, Heading, Row } from './ui';

const useStyles = makeStyles(({ colors }) => ({
  big: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
}));

const d = t.dashboards;

function signed(fils: number): string {
  return fils > 0 ? `+${formatAed(fils)}` : formatAed(fils);
}

/** Short month names for a chart; the year is added when the months span more than one year. */
function monthLabels(months: readonly { month: string }[]): string[] {
  const years = new Set(months.map((m) => m.month.slice(0, 4)));
  return months.map((m) => shortMonth(m.month, years.size > 1));
}

interface SectionProps {
  summary: DashboardSummary;
}

/** Series colours: one hue per kind of money, used the same way on every chart. */
function useSeriesColors() {
  const { chart } = useTheme();
  return {
    income: chart.safe,
    spending: chart.commitments,
    savings: chart.savings,
    over: chart.critical,
  };
}

function useMonthly(summary: DashboardSummary) {
  const { plan, today } = usePrototype();
  const range = useMemo(() => ({ from: summary.from, to: summary.to }), [summary.from, summary.to]);
  return useMemo(() => {
    const income = incomeByMonth(plan, range, today);
    return {
      income,
      spending: spendingByMonth(plan, range),
      saved: savingsByMonth(plan, range, today),
      balance: balanceByMonth(plan, range, today),
      labels: monthLabels(income),
    };
  }, [plan, range, today]);
}

const values = (m: readonly MonthValue[]) => m.map((x) => x.value);

/** The charts at the top of the Overview: in, out and saved; budget used; month by month; savings balance. */
export function OverviewCharts({ summary: s }: SectionProps) {
  const c = useSeriesColors();
  const m = useMonthly(s);
  return (
    <>
      <CompareColumns
        testID="chart-in-out"
        title={d.overviewCharts.inOutTitle}
        caption={d.overviewCharts.inOutCaption}
        columns={[
          { key: 'income', label: d.series.income, value: s.income.received, color: c.income },
          { key: 'spent', label: d.series.spent, value: s.spending.totalActual, color: c.spending },
          { key: 'saved', label: d.series.saved, value: s.savings.period, color: c.savings },
        ]}
      />
      <BudgetMeter summary={s} />
      <GroupedColumns
        testID="chart-by-month"
        title={d.overviewCharts.byMonthTitle}
        caption={d.overviewCharts.byMonthCaption}
        groups={m.labels}
        series={[
          { key: 'income', label: d.series.income, color: c.income, values: values(m.income) },
          { key: 'spent', label: d.series.spent, color: c.spending, values: values(m.spending) },
          { key: 'saved', label: d.series.saved, color: c.savings, values: values(m.saved) },
        ]}
      />
      <MonthColumns
        testID="chart-balance"
        title={d.savings.balanceTitle}
        caption={d.savings.balanceCaption}
        labels={m.labels}
        values={m.balance.map((b) => b.value)}
        color={c.savings}
        emptyText={d.savings.noBalance}
      />
    </>
  );
}

function BudgetMeter({
  summary: s,
  testID = 'chart-budget-used',
}: SectionProps & { testID?: string }) {
  const c = useSeriesColors();
  const sp = s.spending;
  return (
    <Meter
      testID={testID}
      title={d.budget.usedTitle}
      used={sp.totalActual}
      total={sp.totalBudget}
      usedLabel={d.budget.usedLabel}
      color={c.spending}
      overColor={c.over}
      note={
        sp.totalRemaining < 0
          ? `${t.dashboardPage.overBy} ${formatAed(-sp.totalRemaining)}`
          : `${t.dashboardPage.remaining}: ${formatAed(sp.totalRemaining)}`
      }
    />
  );
}

/** Income received and still expected, by month and by source. */
export function IncomeDashboard({ summary: s }: SectionProps) {
  const { plan, today } = usePrototype();
  const c = useSeriesColors();
  const m = useMonthly(s);
  const sources = useMemo(
    () => incomeBySource(plan, { from: s.from, to: s.to }, today),
    [plan, s.from, s.to, today],
  );
  return (
    <>
      {sources.length === 0 ? (
        <Body muted testID="income-dashboard-empty">
          {d.income.none}
        </Body>
      ) : (
        <>
          <CompareColumns
            testID="income-received-expected"
            title={d.income.title}
            columns={[
              {
                key: 'received',
                label: t.dashboardPage.received,
                value: s.income.received,
                color: c.income,
              },
              {
                key: 'expected',
                label: t.dashboardPage.expected,
                value: s.income.expected,
                color: c.income,
              },
            ]}
          />
          <MonthColumns
            testID="income-trend"
            title={d.income.trendTitle}
            caption={d.income.trendCaption}
            labels={m.labels}
            values={values(m.income)}
            color={c.income}
            emptyText="-"
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
      <Card testID="income-dashboard">
        <Heading>{d.details}</Heading>
        <Row label={t.dashboardPage.received} value={formatAed(s.income.received)} strong />
        <Row label={t.dashboardPage.expected} value={formatAed(s.income.expected)} />
      </Card>
    </>
  );
}

/** Budget used, budget by category and how each budget is being used. */
export function BudgetDashboard({ summary: s }: SectionProps) {
  const router = useRouter();
  const { today } = usePrototype();
  const sp = s.spending;
  const elapsed = rangeElapsed({ from: s.from, to: s.to }, today);
  const budgeted = sp.rows.filter((r) => r.budget > 0);
  return (
    <>
      {budgeted.length === 0 ? (
        <Body muted testID="budget-dashboard-empty">
          {t.dashboardPage.budgetsNone}
        </Body>
      ) : (
        <>
          <BudgetMeter summary={s} testID="budget-meter" />
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
      <Card testID="budget-dashboard">
        <Heading>{d.details}</Heading>
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
  const c = useSeriesColors();
  const m = useMonthly(s);
  const sp = s.spending;
  const spentRows = sp.rows.filter((r) => r.actual > 0).sort((a, b) => b.actual - a.actual);
  return (
    <>
      {spentRows.length === 0 ? (
        <Body muted testID="spending-dashboard-empty">
          {d.spending.none}
        </Body>
      ) : (
        <>
          <MonthColumns
            testID="spending-trend"
            title={d.spending.trendTitle}
            caption={d.spending.trendCaption}
            labels={m.labels}
            values={values(m.spending)}
            color={c.spending}
            emptyText="-"
          />
          <HorizontalBars
            testID="spending-by-category"
            title={d.spending.byCategory}
            caption={d.spending.byCategoryCaption}
            items={spentRows.map((r) => ({ key: r.categoryId, label: r.label, value: r.actual }))}
          />
          {sp.totalBudget > 0 ? <BudgetMeter summary={s} testID="spending-meter" /> : null}
        </>
      )}
      <Card tone={sp.totalRemaining < 0 ? 'danger' : 'default'} testID="spending-dashboard">
        <Heading>{d.details}</Heading>
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
      <Button
        label={t.dashboardPage.openSpending}
        variant="secondary"
        onPress={() => router.navigate('/spending')}
        testID="dash-open-spending"
      />
    </>
  );
}

/** The savings balance and what was added each month. */
export function SavingsDashboard({ summary: s }: SectionProps) {
  const styles = useStyles();
  const router = useRouter();
  const c = useSeriesColors();
  const m = useMonthly(s);
  const hasRecords = m.balance.some((b) => b.value !== null);
  return (
    <>
      {hasRecords ? (
        <>
          <MonthColumns
            testID="savings-balance-chart"
            title={d.savings.balanceTitle}
            caption={d.savings.balanceCaption}
            labels={m.labels}
            values={m.balance.map((b) => b.value)}
            color={c.savings}
            emptyText={d.savings.noBalance}
          />
          <MonthColumns
            testID="savings-trend"
            title={d.savings.trendTitle}
            caption={d.savings.trendCaption}
            labels={m.labels}
            values={values(m.saved)}
            color={c.savings}
            emptyText="-"
          />
        </>
      ) : (
        <Body muted testID="savings-dashboard-empty">
          {d.savings.none}
        </Body>
      )}
      <Card tone="info" testID="savings-dashboard">
        <Heading>{d.details}</Heading>
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
            <Body muted>
              {t.dashboardPage.totalNote(formatDate(s.savings.totalAsOf as ISODate))}
            </Body>
          </>
        )}
      </Card>
      <Button
        label={d.savings.open}
        variant="secondary"
        onPress={() => router.navigate('/savings')}
        testID="dash-open-savings"
      />
    </>
  );
}
