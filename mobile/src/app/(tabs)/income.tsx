import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { HorizontalBars, StatTile, TrendBars } from '../../components/dashboardParts';
import { Body, Button, Card, Heading, Row, Screen } from '../../components/ui';
import { FREQUENCY_LABELS, type Frequency } from '../../domain/budgetModel';
import {
  incomeBreakdown,
  incomeRange,
  incomeSummary,
  netPerCycle,
  upcomingIncome,
} from '../../domain/incomeInsights';
import { formatAed } from '../../domain/money';
import { SAMPLE_HISTORY } from '../../domain/sampleData';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

export default function Income() {
  const router = useRouter();
  const { plan } = usePrototype();
  const sources = incomeBreakdown(plan);
  const s = incomeSummary(plan);
  const upcoming = upcomingIncome(plan, 60);
  const history = SAMPLE_HISTORY.income;
  const net = netPerCycle(SAMPLE_HISTORY.income, SAMPLE_HISTORY.spending);
  const range = incomeRange(history);

  return (
    <Screen testID="income-screen">
      <StatTile
        testID="tile-income-total"
        label={t.income.tileTotal}
        value={formatAed(s.monthlyTotal)}
        note={t.income.tileTotalNote}
      />
      <StatTile
        testID="tile-income-stable"
        label={t.income.tileStable}
        value={formatAed(s.monthlyStable)}
        note={t.income.tileStableNote(Math.round(s.stableShare * 100))}
      />
      <StatTile
        testID="tile-income-cover"
        label={t.income.tileCover}
        value={`${Math.round(s.stableCoverage * 100)}%`}
        note={t.income.tileCoverNote}
      />

      <HorizontalBars
        testID="income-sources-chart"
        title={t.income.sourcesTitle}
        caption={t.income.sourcesCaption}
        items={sources.map((i) => ({ key: i.id, label: i.name, value: i.monthly }))}
      />

      <Card testID="income-sources-list">
        {sources.map((i) => (
          <Pressable
            key={i.id}
            accessibilityRole="button"
            accessibilityLabel={`${i.name}, ${formatAed(i.amount)}, ${FREQUENCY_LABELS[i.frequency as Frequency]}, ${i.stable ? t.income.predictable : t.income.varies}`}
            onPress={() => router.push(`/edit/income/${i.id}`)}
            testID={`income-source-${i.id}`}
          >
            <Row label={i.name} value={formatAed(i.amount)} strong />
            <Body muted>
              {t.income.sourceLine(
                i.kindLabel,
                FREQUENCY_LABELS[i.frequency as Frequency],
                i.stable ? t.income.predictable : t.income.varies,
              )}
            </Body>
          </Pressable>
        ))}
        <Button
          label={t.income.addIncome}
          variant="secondary"
          onPress={() => router.push('/edit/income/new')}
          testID="add-income-source"
        />
      </Card>

      <Card testID="upcoming-income">
        <Heading>{t.income.upcomingTitle}</Heading>
        <Body muted>{t.income.upcomingCaption}</Body>
        {upcoming.length === 0 ? (
          <Body muted>{t.income.noUpcoming}</Body>
        ) : (
          upcoming.map((e) => (
            <Row
              key={e.id}
              label={`${e.name} (${t.income.inDays(e.inDays)})`}
              value={formatAed(e.amount)}
            />
          ))
        )}
      </Card>

      <Card tone={s.stableGapAfterSavings < 0 ? 'warn' : 'info'} testID="stability-card">
        <Heading>{t.income.stabilityTitle}</Heading>
        <Body>
          {s.stableGapAfterSavings < 0
            ? t.income.stabilityGap(
                Math.round(s.stableCoverage * 100),
                formatAed(-s.stableGapAfterSavings),
              )
            : t.income.stabilityOk(formatAed(s.stableGapAfterSavings))}
        </Body>
      </Card>

      {range ? (
        <Card testID="range-card">
          <Heading>{t.income.rangeTitle}</Heading>
          <Body>
            {t.income.rangeBody(
              formatAed(range.min),
              formatAed(range.max),
              formatAed(range.average),
            )}
          </Body>
        </Card>
      ) : null}

      <TrendBars
        testID="income-trend"
        title={t.income.trendTitle}
        caption={t.income.trendCaption}
        values={history}
        firstLabel="6 cycles ago"
        lastLabel="Last cycle"
        summary={t.income.trendSummary(
          formatAed(history[0] ?? 0),
          formatAed(history[history.length - 1] ?? 0),
        )}
      />
      <TrendBars
        testID="net-trend"
        title={t.income.netTitle}
        values={net}
        firstLabel="6 cycles ago"
        lastLabel="Last cycle"
        summary={t.income.netSummary(formatAed(net[0] ?? 0), formatAed(net[net.length - 1] ?? 0))}
      />
    </Screen>
  );
}
