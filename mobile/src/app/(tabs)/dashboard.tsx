import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { track } from '../../analytics/events';
import { BalanceChart, BreakdownBar } from '../../components/charts';
import { Body, Button, Card, Heading, HeroCard, Row, Screen } from '../../components/ui';
import { formatDate, relativeDays } from '../../domain/dates';
import { buildBalanceTimeline, buildBreakdown } from '../../domain/forecastCharts';
import { formatAed } from '../../domain/money';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';
import { makeStyles, useTheme } from '../../theme/ThemeProvider';
import { fontSize, minTouchTarget, spacing } from '../../theme/tokens';

const MAX_UPCOMING = 5;

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
  pairValue: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
}));

export default function Dashboard() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const { baseline: f, reminders } = usePrototype();
  const active = reminders.filter((r) => r.active);

  useEffect(() => {
    track('dashboard_viewed', { has_warning: f.warnings.length > 0, horizon_type: 'next_payday' });
  }, [f.warnings.length]);

  return (
    <Screen testID="dashboard-screen">
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
          <Text style={styles.heroShortfall}>{t.dashboard.shortfall(formatAed(f.shortfall))}</Text>
        )}
      </HeroCard>

      <Card>
        <View style={styles.pair}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.dashboard.daily}: ${t.dashboard.perDay(formatAed(f.dailySafe))}`}
            accessibilityHint={t.dashboard.tapToExplain}
            onPress={() => router.push('/explain/daily')}
            style={styles.pairItem}
            testID="metric-daily"
          >
            <Body muted>{t.dashboard.daily}</Body>
            <Heading>{t.dashboard.perDay(formatAed(f.dailySafe))}</Heading>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t.dashboard.forecast}: ${formatAed(f.forecastBalance)}, ${t.dashboard.forecastOn(f.horizonDays)}`}
            accessibilityHint={t.dashboard.tapToExplain}
            onPress={() => router.push('/explain/forecast')}
            style={styles.pairItem}
            testID="metric-forecast"
          >
            <Body muted>{t.dashboard.forecast}</Body>
            <Heading>{formatAed(f.forecastBalance)}</Heading>
            <Body muted>{t.dashboard.forecastOn(f.horizonDays)}</Body>
          </Pressable>
        </View>
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

      <BalanceChart timeline={buildBalanceTimeline(f)} />
      <BreakdownBar breakdown={buildBreakdown(f)} />

      <Heading>{t.dashboard.warnings}</Heading>
      {f.warnings.length === 0 ? (
        <Body muted>{t.dashboard.noWarnings}</Body>
      ) : (
        f.warnings.map((w) => (
          <Pressable
            key={w.id}
            accessibilityRole="button"
            accessibilityLabel={t.warning.kinds[w.kind]}
            accessibilityHint={t.dashboard.tapToExplain}
            onPress={() => router.push(`/warning/${w.id}`)}
            style={styles.metric}
            testID={`warning-${w.id}`}
          >
            <Card
              tone={w.severity === 'high' ? 'danger' : w.severity === 'medium' ? 'warn' : 'default'}
            >
              <Row label={t.warning.kinds[w.kind]} value={formatAed(w.amount)} strong />
              {w.commitmentName ? <Body muted>{w.commitmentName}</Body> : null}
            </Card>
          </Pressable>
        ))
      )}

      <Heading>{t.dashboard.upcoming}</Heading>
      {f.upcoming.slice(0, MAX_UPCOMING).map((c) => (
        <Card key={c.id}>
          <Row label={c.name} value={formatAed(c.amount)} />
          <Body muted>{t.commitments.due(c.dueInDays)}</Body>
        </Card>
      ))}

      <Button
        label={t.dashboard.whatIf}
        icon="flask"
        onPress={() => router.push('/scenario')}
        testID="open-scenario"
      />
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
