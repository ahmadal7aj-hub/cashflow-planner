import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { track } from '../../analytics/events';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { BalanceChart, BreakdownBar } from '../../components/charts';
import { buildBalanceTimeline, buildBreakdown } from '../../domain/forecastCharts';
import { formatAed } from '../../domain/money';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';
import { colors, fontSize, minTouchTarget } from '../../theme/tokens';

const MAX_UPCOMING = 5;

export default function Dashboard() {
  const router = useRouter();
  const { baseline: f } = usePrototype();

  useEffect(() => {
    track('dashboard_viewed', { has_warning: f.warnings.length > 0, horizon_type: 'next_payday' });
  }, [f.warnings.length]);

  return (
    <Screen testID="dashboard-screen">
      <Card tone="info" testID="safe-to-spend-card">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.dashboard.safeToSpend}: ${formatAed(f.safeToSpend)}, ${t.dashboard.horizon(f.horizonDays)}`}
          accessibilityHint={t.dashboard.tapToExplain}
          onPress={() => router.push('/explain/safe')}
          style={styles.metric}
          testID="metric-safe"
        >
          <Body muted>{t.dashboard.safeToSpend}</Body>
          <Text style={styles.hero}>{formatAed(f.safeToSpend)}</Text>
          <Body muted>{t.dashboard.horizon(f.horizonDays)}</Body>
        </Pressable>
        {f.shortfall > 0 && <Body>{t.dashboard.shortfall(formatAed(f.shortfall))}</Body>}
      </Card>

      <Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.dashboard.daily}: ${t.dashboard.perDay(formatAed(f.dailySafe))}`}
          accessibilityHint={t.dashboard.tapToExplain}
          onPress={() => router.push('/explain/daily')}
          style={styles.metric}
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
          style={styles.metric}
          testID="metric-forecast"
        >
          <Body muted>{t.dashboard.forecast}</Body>
          <Heading>{formatAed(f.forecastBalance)}</Heading>
          <Body muted>{t.dashboard.forecastOn(f.horizonDays)}</Body>
        </Pressable>
      </Card>

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
        onPress={() => router.push('/scenario')}
        testID="open-scenario"
      />
      <Button
        label={t.dashboard.settings}
        variant="secondary"
        onPress={() => router.push('/settings')}
        testID="open-settings"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metric: { minHeight: minTouchTarget, gap: 4 },
  hero: { fontSize: fontSize.hero, fontWeight: '800', color: colors.primary },
});
