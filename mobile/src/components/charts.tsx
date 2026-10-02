import { useState } from 'react';
import { Text, View } from 'react-native';

import type { Breakdown, BalanceTimeline, SegmentKey } from '../domain/forecastCharts';
import { formatAed } from '../domain/money';
import { t } from '../i18n/strings';
import { fontSize, spacing } from '../theme/tokens';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { Body, Button, Card, Heading, Row } from './ui';

const CHART_HEIGHT = 140;
const SEGMENT_GAP = 2;

/** One-series column chart of the projected balance, with the kept-aside line and a table view. */
export function BalanceChart({ timeline }: { timeline: BalanceTimeline }) {
  const styles = useStyles();
  const [table, setTable] = useState(false);
  const { days, keptAside } = timeline;
  const first = days[0];
  const last = days[days.length - 1];
  const yMax = Math.max(1, keptAside, ...days.map((d) => d.balance));
  const scale = (fils: number) => Math.max(0, fils / yMax) * CHART_HEIGHT;
  const summary =
    first && last
      ? t.charts.summary(
          formatAed(first.balance),
          formatAed(last.balance),
          days.length,
          formatAed(keptAside),
        )
      : '';

  return (
    <Card testID="balance-chart">
      <Heading>{t.charts.balanceTitle}</Heading>
      <Body muted>{t.charts.balanceCaption}</Body>

      <View accessible accessibilityLabel={summary} testID="balance-chart-plot">
        <View style={styles.plot}>
          <View style={styles.bars}>
            {days.map((d) => (
              <View key={d.day} style={styles.barSlot}>
                <View
                  style={[styles.bar, { height: scale(d.balance) }]}
                  testID={`balance-bar-${d.day}`}
                />
              </View>
            ))}
          </View>
          <View style={[styles.keptLine, { bottom: scale(keptAside) }]} />
          <Text style={[styles.keptLabel, { bottom: scale(keptAside) + 2 }]}>
            {t.charts.keptAside(formatAed(keptAside))}
          </Text>
        </View>
        <View style={styles.markerRow}>
          {days.map((d) => (
            <Text key={d.day} style={styles.marker}>
              {d.dueNames.length > 0 ? '▲' : ' '}
            </Text>
          ))}
        </View>
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>{t.charts.today}</Text>
          <Text style={styles.axisLabel}>{t.charts.inDays(days.length - 1)}</Text>
        </View>
      </View>
      <Body muted>{`▲ ${t.charts.billDue}`}</Body>

      <Button
        label={table ? t.charts.hideTable : t.charts.showTable}
        variant="secondary"
        onPress={() => setTable((v) => !v)}
        testID="balance-table-toggle"
      />
      {table && (
        <View testID="balance-table">
          {days.map((d) => (
            <Row
              key={d.day}
              label={d.day === 0 ? t.charts.today : `${t.charts.tableDay} ${d.day}`}
              value={formatAed(d.balance)}
            />
          ))}
        </View>
      )}
    </Card>
  );
}

/** Part-to-whole stacked bar. Identity is carried by the legend labels and values, not color alone. */
export function BreakdownBar({ breakdown }: { breakdown: Breakdown }) {
  const styles = useStyles();
  const { chart: chartColors } = useTheme();
  const { segments, total, shortfall } = breakdown;
  return (
    <Card testID="breakdown-chart">
      <Heading>{t.charts.breakdownTitle}</Heading>
      <Body muted>{t.charts.breakdownCaption}</Body>

      <View
        style={styles.stack}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {segments.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.segment,
              {
                flex: s.amount,
                backgroundColor: chartColors[s.key],
                marginRight: i === segments.length - 1 ? 0 : SEGMENT_GAP,
              },
              i === 0 && styles.segmentFirst,
              i === segments.length - 1 && styles.segmentLast,
            ]}
          />
        ))}
      </View>

      <View testID="breakdown-legend">
        {segments.map((s) => (
          <LegendRow key={s.key} segmentKey={s.key} amount={s.amount} total={total} />
        ))}
      </View>
      {shortfall > 0 && (
        <Text style={styles.shortfall} testID="breakdown-shortfall">
          {`⚠ ${t.charts.shortfall(formatAed(shortfall))}`}
        </Text>
      )}
    </Card>
  );
}

function LegendRow({
  segmentKey,
  amount,
  total,
}: {
  segmentKey: SegmentKey;
  amount: number;
  total: number;
}) {
  const styles = useStyles();
  const { chart: chartColors } = useTheme();
  const label = t.charts.segments[segmentKey];
  const value = formatAed(amount);
  const percent = t.charts.percent(Math.round((amount * 100) / total));
  return (
    <View style={styles.legendRow} accessible accessibilityLabel={`${label}: ${value}, ${percent}`}>
      <View style={[styles.swatch, { backgroundColor: chartColors[segmentKey] }]} />
      <Text style={[styles.legendText, styles.legendLabel]}>{label}</Text>
      <Text style={styles.legendText}>{`${value}  ${percent}`}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, chart: chartColors }) => ({
  plot: {
    height: CHART_HEIGHT + 20,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: chartColors.baseline,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT },
  barSlot: { flex: 1, paddingHorizontal: 1, justifyContent: 'flex-end' },
  bar: {
    backgroundColor: chartColors.bar,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  keptLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderTopColor: chartColors.keptAsideLine,
    borderStyle: 'dashed',
  },
  keptLabel: {
    position: 'absolute',
    right: 0,
    fontSize: fontSize.caption,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
  },
  markerRow: { flexDirection: 'row' },
  marker: { flex: 1, textAlign: 'center', fontSize: 10, color: chartColors.muted },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  axisLabel: { fontSize: fontSize.caption, color: colors.textMuted },
  stack: { flexDirection: 'row', height: 24 },
  segment: { height: 24 },
  segmentFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  segmentLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', minHeight: 32, gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: fontSize.body, color: colors.text },
  legendLabel: { flex: 1 },
  shortfall: { fontSize: fontSize.body, fontWeight: '600', color: colors.dangerText },
}));
