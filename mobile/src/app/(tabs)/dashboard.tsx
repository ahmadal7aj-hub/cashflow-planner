import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { track } from '../../analytics/events';
import { DateRangeControl, useDateRange } from '../../components/DateRangeControl';
import { ChipGroup } from '../../components/forms';
import { Body, Button, Card, Heading, HeroCard, Row, Screen } from '../../components/ui';
import { coversWholeMonths, summarize } from '../../domain/dashboardRange';
import { formatDate, relativeDays } from '../../domain/dates';
import { formatAed } from '../../domain/money';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { fontSize, minTouchTarget, spacing } from '../../theme/tokens';

const MAX_BUDGET_ROWS = 5;

const useStyles = makeStyles(({ colors }) => ({
  metric: { minHeight: minTouchTarget, gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroLabel: { fontSize: fontSize.body, fontWeight: '600', color: colors.heroMuted },
  heroValue: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -1,
  },
  heroSub: { fontSize: fontSize.body, color: colors.heroMuted },
  heroShortfall: { fontSize: fontSize.body, fontWeight: '700', color: colors.heroGold },
  heroHint: { fontSize: fontSize.caption, color: colors.heroMuted, marginTop: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1, minHeight: minTouchTarget, gap: 4 },
  bigValue: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
}));

function signed(fils: number): string {
  return fils > 0 ? `+${formatAed(fils)}` : formatAed(fils);
}

export default function Dashboard() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const { plan, today, baseline: f, reminders } = usePrototype();
  const active = reminders.filter((r) => r.active);

  const dates = useDateRange(today);
  const { range, preset } = dates;
  const [savingsView, setSavingsView] = useState<'period' | 'total'>('period');
  const s = useMemo(() => summarize(plan, range, today), [plan, range, today]);

  useEffect(() => {
    track('dashboard_viewed', { has_warning: f.warnings.length > 0, horizon_type: 'next_payday' });
  }, [f.warnings.length]);

  const sp = s.spending;
  const overall = sp.totalRemaining;
  const monthView = preset === 'current-month';
  const periodLabel = monthView ? t.dashboardPage.thisMonthSavings : t.dashboardPage.periodSavings;
  const showSafe = plan.availableCash > 0;

  return (
    <Screen testID="dashboard-screen">
      <DateRangeControl state={dates} />

      <Card testID="income-summary">
        <Heading>{t.dashboardPage.incomeTitle}</Heading>
        <Row label={t.dashboardPage.received} value={formatAed(s.income.received)} strong />
        {s.income.expected > 0 ? (
          <Row label={t.dashboardPage.expected} value={formatAed(s.income.expected)} />
        ) : null}
      </Card>

      <Card tone={overall < 0 ? 'danger' : 'default'} testID="spending-summary">
        <Heading>{t.dashboardPage.spendingTitle}</Heading>
        <Row label={t.dashboardPage.budget} value={formatAed(sp.totalBudget)} />
        <Row label={t.dashboardPage.spent} value={formatAed(sp.totalActual)} />
        <Row
          label={overall < 0 ? t.dashboardPage.overBy : t.dashboardPage.remaining}
          value={formatAed(Math.abs(overall))}
          strong
        />
        {sp.unbudgetedActual > 0 ? (
          <Body muted>{t.dashboardPage.unbudgeted(formatAed(sp.unbudgetedActual))}</Body>
        ) : null}
        {!coversWholeMonths(range) ? <Body muted>{t.dashboardPage.prorated}</Body> : null}
      </Card>

      <Card tone="info" testID="savings-summary">
        <Heading>{t.dashboardPage.savingsTitle}</Heading>
        <ChipGroup
          label={t.dashboardPage.savingsTitle}
          testID="savings-view"
          value={savingsView}
          onChange={setSavingsView}
          options={[
            { value: 'period', label: periodLabel },
            { value: 'total', label: t.dashboardPage.totalSavings },
          ]}
        />
        {savingsView === 'period' ? (
          <>
            <Text style={styles.bigValue} testID="savings-value">
              {signed(s.savings.period)}
            </Text>
            <Body muted>{t.dashboardPage.periodNote}</Body>
          </>
        ) : s.savings.total === null ? (
          <Body testID="savings-unknown">{t.dashboardPage.totalUnknown}</Body>
        ) : (
          <>
            <Text style={styles.bigValue} testID="savings-value">
              {formatAed(s.savings.total)}
            </Text>
            <Body muted>{t.dashboardPage.totalNote(formatDate(s.savings.totalAsOf))}</Body>
          </>
        )}
        {s.savings.projection && s.savings.projection.projectedClosing !== null ? (
          <Body muted testID="savings-projected">
            {t.dashboardPage.projectedNote(formatAed(s.savings.projection.projectedClosing))}
          </Body>
        ) : null}
      </Card>

      <Card testID="budgets-summary">
        <Heading>{t.dashboardPage.budgetsTitle}</Heading>
        {sp.rows.length === 0 ? <Body muted>{t.dashboardPage.budgetsNone}</Body> : null}
        {sp.rows.slice(0, MAX_BUDGET_ROWS).map((r) => (
          <Row
            key={r.categoryId}
            label={
              r.unbudgeted ? `${r.label} (${t.spendingPage.unbudgeted.split(':')[0]})` : r.label
            }
            value={r.over ? t.spendingPage.overBy(formatAed(-r.remaining)) : formatAed(r.remaining)}
          />
        ))}
        <Button
          label={t.dashboardPage.openSpending}
          variant="secondary"
          onPress={() => router.navigate('/spending')}
          testID="open-spending"
        />
        <Button
          label={t.dashboardPage.openBudget}
          variant="secondary"
          onPress={() => router.navigate('/budget')}
          testID="open-budget"
        />
      </Card>

      {active.length > 0 && (
        <Card tone="warn" testID="reminders-card">
          <Heading>{t.reminder.cardTitle}</Heading>
          {active.map((r) => (
            <Body key={r.id}>
              {t.reminder.line(r.name, relativeDays(r.daysUntilDue), formatDate(r.dueDate))}
            </Body>
          ))}
        </Card>
      )}

      {showSafe ? (
        <>
          <HeroCard testID="safe-to-spend-card">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t.dashboard.safeToSpend}: ${formatAed(f.safeToSpend)}, ${t.dashboard.horizon(f.horizonDays)}`}
              accessibilityHint={t.dashboard.tapToExplain}
              onPress={() => router.push('/explain/safe')}
              style={styles.metric}
              testID="metric-safe"
            >
              <View style={styles.heroTop} importantForAccessibility="no-hide-descendants">
                <Ionicons name="shield-checkmark" size={20} color={colors.heroGold} />
                <Text style={styles.heroLabel}>{t.dashboard.safeToSpend}</Text>
              </View>
              <Text style={styles.heroValue}>{formatAed(f.safeToSpend)}</Text>
              <Text style={styles.heroSub}>{t.dashboard.horizon(f.horizonDays)}</Text>
              <Text style={styles.heroHint}>{t.dashboard.tapToExplain}</Text>
            </Pressable>
            {f.shortfall > 0 && (
              <Text style={styles.heroShortfall}>
                {t.dashboard.shortfall(formatAed(f.shortfall))}
              </Text>
            )}
          </HeroCard>
          <Button
            label={t.dashboard.whatIf}
            icon="flask"
            onPress={() => router.push('/scenario')}
            testID="open-scenario"
          />
        </>
      ) : null}

      <Button
        label={t.dashboard.settings}
        icon="settings-outline"
        variant="secondary"
        onPress={() => router.push('/settings')}
        testID="open-settings"
      />
    </Screen>
  );
}
