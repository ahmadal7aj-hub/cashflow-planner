import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAed, formatAedShort, type Fils } from '../domain/money';
import type { PaceStatus } from '../domain/spendingInsights';
import { chartColors, colors, fontSize, radius, spacing } from '../theme/tokens';
import { Body, Card, Heading } from './ui';

/** A headline number with a label and a supporting line. */
export function StatTile({
  label,
  value,
  note,
  testID,
}: {
  label: string;
  value: string;
  note?: string;
  testID?: string;
}) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${label}: ${value}${note ? `. ${note}` : ''}`}
      testID={testID}
    >
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {note ? <Text style={styles.tileNote}>{note}</Text> : null}
    </View>
  );
}

const STATUS_TEXT: Record<PaceStatus, string> = {
  'on-track': '✓ On track',
  ahead: '▲ Ahead of pace',
  over: '⚠ Over budget',
};

/**
 * Budget progress: fill = share spent, tick = where straight-line pace would be today.
 * Status is always written out with a symbol, so it never relies on color alone.
 */
export function BudgetBar({
  name,
  spent,
  budget,
  elapsed,
  status,
  testID,
}: {
  name: string;
  spent: Fils;
  budget: Fils;
  /** Fraction of the cycle that has passed (0..1). */
  elapsed: number;
  status: PaceStatus;
  testID?: string;
}) {
  const used = budget > 0 ? Math.min(1, spent / budget) : 0;
  return (
    <View
      style={styles.budgetRow}
      accessible
      accessibilityLabel={`${name}: ${formatAed(spent)} of ${formatAed(budget)}. ${STATUS_TEXT[status].slice(2)}.`}
      testID={testID}
    >
      <View style={styles.budgetHead}>
        <Text style={styles.budgetName}>{name}</Text>
        <Text style={[styles.status, status === 'over' && styles.statusOver]}>
          {STATUS_TEXT[status]}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${used * 100}%` }, status === 'over' && styles.fillOver]}
        />
        <View style={[styles.paceTick, { left: `${Math.min(1, Math.max(0, elapsed)) * 100}%` }]} />
      </View>
      <Text style={styles.budgetFoot}>{`${formatAed(spent)} of ${formatAed(budget)}`}</Text>
    </View>
  );
}

/** Goal progress: fill = share saved. Status is always written out with a symbol, never color alone. */
export function GoalBar({
  name,
  pct,
  line,
  status,
  onPress,
  testID,
}: {
  name: string;
  /** 0..1 */
  pct: number;
  line: string;
  status: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${name}. ${line}. ${status}`}
      onPress={onPress}
      style={styles.budgetRow}
      testID={testID}
    >
      <Text style={styles.budgetName}>{name}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, pct)) * 100}%` }]} />
      </View>
      <Text style={styles.budgetFoot}>{line}</Text>
      <Text style={styles.status}>{status}</Text>
    </Pressable>
  );
}
export interface BarItem {
  key: string;
  label: string;
  value: Fils;
}

/** Magnitude comparison across categories: one hue, bars sized to the largest, value labelled on each. */
export function HorizontalBars({
  title,
  caption,
  items,
  testID,
}: {
  title: string;
  caption?: string;
  items: readonly BarItem[];
  testID?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <Card testID={testID}>
      <Heading>{title}</Heading>
      {caption ? <Body muted>{caption}</Body> : null}
      {items.map((i) => (
        <View
          key={i.key}
          style={styles.hRow}
          accessible
          accessibilityLabel={`${i.label}: ${formatAed(i.value)}, ${Math.round((i.value * 100) / Math.max(1, total))}%`}
        >
          <View style={styles.hHead}>
            <Text style={styles.hLabel}>{i.label}</Text>
            <Text style={styles.hValue}>{formatAed(i.value)}</Text>
          </View>
          <View style={styles.hTrack}>
            <View style={[styles.hFill, { width: `${(i.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </Card>
  );
}

/** Per-cycle trend as columns: emphasis on the latest cycle, earlier ones muted, every bar labelled. */
export function TrendBars({
  title,
  caption,
  values,
  firstLabel,
  lastLabel,
  summary,
  testID,
}: {
  title: string;
  caption?: string;
  values: readonly Fils[];
  firstLabel: string;
  lastLabel: string;
  summary: string;
  testID?: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <Card testID={testID}>
      <Heading>{title}</Heading>
      {caption ? <Body muted>{caption}</Body> : null}
      <View accessible accessibilityLabel={summary}>
        <View style={styles.trendBars}>
          {values.map((v, i) => {
            const latest = i === values.length - 1;
            return (
              <View key={i} style={styles.trendSlot}>
                <Text style={styles.trendValue}>{formatAedShort(v)}</Text>
                <View
                  style={[
                    styles.trendBar,
                    { height: Math.max(2, (Math.max(0, v) / max) * 90) },
                    latest ? styles.trendLatest : styles.trendMuted,
                  ]}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>{firstLabel}</Text>
          <Text style={styles.axisLabel}>{lastLabel}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  tileLabel: { fontSize: fontSize.caption, color: colors.textMuted },
  tileValue: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  tileNote: { fontSize: fontSize.caption, color: colors.textMuted },

  budgetRow: { gap: 4, paddingVertical: spacing.xs },
  budgetHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  budgetName: { flex: 1, fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  status: { fontSize: fontSize.caption, color: colors.textMuted },
  statusOver: { color: colors.dangerText, fontWeight: '700' },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: chartColors.gridline,
    overflow: 'hidden',
  },
  fill: { height: 10, borderRadius: 5, backgroundColor: chartColors.bar },
  fillOver: { backgroundColor: '#d03b3b' },
  paceTick: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: chartColors.keptAsideLine,
  },
  budgetFoot: { fontSize: fontSize.caption, color: colors.textMuted },

  hRow: { gap: 4, paddingVertical: 2 },
  hHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  hLabel: { flex: 1, fontSize: fontSize.body, color: colors.text },
  hValue: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  hTrack: { height: 8, borderRadius: 4, backgroundColor: chartColors.gridline, overflow: 'hidden' },
  hFill: { height: 8, borderRadius: 4, backgroundColor: chartColors.bar },

  trendBars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: spacing.xs },
  trendSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  trendValue: { fontSize: 10, color: colors.textMuted },
  trendBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  trendLatest: { backgroundColor: chartColors.bar },
  trendMuted: { backgroundColor: '#9ec5f4' },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  axisLabel: { fontSize: fontSize.caption, color: colors.textMuted },
});
