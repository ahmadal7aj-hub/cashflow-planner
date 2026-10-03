import { Text, View } from 'react-native';

import { formatAed, formatAedShort } from '../domain/money';
import { makeStyles } from '../theme/ThemeProvider';
import { fontSize, radius, spacing } from '../theme/tokens';
import { Body, Card, Heading } from './ui';

/**
 * Dashboard charts drawn with plain views (no extra library). Every chart has a title, values written on the marks,
 * a legend whenever there is more than one series, and an accessibility label that reads the numbers out, so nothing
 * relies on colour alone.
 */

const PLOT_HEIGHT = 140;

export interface Column {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** A few named amounts side by side, for example money in, spent and saved. */
export function CompareColumns({
  title,
  caption,
  columns,
  testID,
}: {
  title: string;
  caption?: string;
  columns: readonly Column[];
  testID?: string;
}) {
  const styles = useStyles();
  const max = Math.max(1, ...columns.map((c) => Math.abs(c.value)));
  const summary = `${title}. ${columns.map((c) => `${c.label}: ${formatAed(c.value)}`).join('; ')}`;
  return (
    <Card testID={testID}>
      <Heading>{title}</Heading>
      {caption ? <Body muted>{caption}</Body> : null}
      <View accessible accessibilityLabel={summary} style={styles.plot}>
        {columns.map((c) => (
          <View key={c.key} style={styles.slot}>
            <Text style={styles.value}>{formatAedShort(c.value)}</Text>
            <View
              testID={testID ? `${testID}-${c.key}` : undefined}
              style={[
                styles.column,
                {
                  height: Math.max(3, (Math.abs(c.value) / max) * PLOT_HEIGHT),
                  backgroundColor: c.color,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labels}>
        {columns.map((c) => (
          <Text key={c.key} style={styles.label} numberOfLines={2}>
            {c.label}
          </Text>
        ))}
      </View>
    </Card>
  );
}

export interface Series {
  key: string;
  label: string;
  color: string;
  values: readonly number[];
}

/** Two or three series per month, side by side, with a legend. */
export function GroupedColumns({
  title,
  caption,
  groups,
  series,
  testID,
}: {
  title: string;
  caption?: string;
  /** One label per month. */
  groups: readonly string[];
  series: readonly Series[];
  testID?: string;
}) {
  const styles = useStyles();
  const max = Math.max(1, ...series.flatMap((s) => s.values.map((v) => Math.abs(v))));
  const summary = `${title}. ${groups
    .map(
      (g, i) =>
        `${g}: ${series.map((s) => `${s.label} ${formatAed(s.values[i] ?? 0)}`).join(', ')}`,
    )
    .join('; ')}`;
  return (
    <Card testID={testID}>
      <Heading>{title}</Heading>
      {caption ? <Body muted>{caption}</Body> : null}
      <Legend items={series} />
      <View accessible accessibilityLabel={summary} style={styles.plot}>
        {groups.map((g, i) => (
          <View key={`${g}-${i}`} style={styles.group}>
            {series.map((s) => (
              <View
                key={s.key}
                style={[
                  styles.thin,
                  {
                    height: Math.max(2, (Math.abs(s.values[i] ?? 0) / max) * PLOT_HEIGHT),
                    backgroundColor: s.color,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labels}>
        {groups.map((g, i) => (
          <Text key={`${g}-${i}`} style={styles.label}>
            {g}
          </Text>
        ))}
      </View>
    </Card>
  );
}

/** One series per month with the value on every column, for example the savings balance. */
export function MonthColumns({
  title,
  caption,
  labels,
  values,
  color,
  emptyText,
  testID,
}: {
  title: string;
  caption?: string;
  labels: readonly string[];
  /** null: nothing to show for that month (drawn as an empty slot). */
  values: readonly (number | null)[];
  color: string;
  emptyText: string;
  testID?: string;
}) {
  const styles = useStyles();
  const max = Math.max(1, ...values.map((v) => Math.abs(v ?? 0)));
  const summary = `${title}. ${labels
    .map((l, i) => `${l}: ${values[i] === null ? emptyText : formatAed(values[i]!)}`)
    .join('; ')}`;
  return (
    <Card testID={testID}>
      <Heading>{title}</Heading>
      {caption ? <Body muted>{caption}</Body> : null}
      <View accessible accessibilityLabel={summary} style={styles.plot}>
        {values.map((v, i) => (
          <View key={`${labels[i]}-${i}`} style={styles.slot}>
            <Text style={styles.valueSmall}>{v === null ? '–' : formatAedShort(v)}</Text>
            {v === null ? null : (
              <View
                style={[
                  styles.column,
                  {
                    height: Math.max(2, (Math.abs(v) / max) * PLOT_HEIGHT),
                    backgroundColor: color,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labels}>
        {labels.map((l, i) => (
          <Text key={`${l}-${i}`} style={styles.label}>
            {l}
          </Text>
        ))}
      </View>
    </Card>
  );
}

/** How much of a total has been used, as a thick bar with the percentage written out. */
export function Meter({
  title,
  used,
  total,
  usedLabel,
  color,
  overColor,
  note,
  testID,
}: {
  title: string;
  used: number;
  total: number;
  usedLabel: string;
  color: string;
  overColor: string;
  note: string;
  testID?: string;
}) {
  const styles = useStyles();
  const share = total > 0 ? used / total : used > 0 ? 1 : 0;
  const over = used > total;
  const pct = Math.round(share * 100);
  return (
    <Card tone={over ? 'danger' : 'default'} testID={testID}>
      <Heading>{title}</Heading>
      <View
        accessible
        accessibilityLabel={`${title}: ${usedLabel} ${formatAed(used)} of ${formatAed(total)}, ${pct}%`}
      >
        <Text style={styles.meterPct} testID={testID ? `${testID}-pct` : undefined}>
          {`${pct}%`}
        </Text>
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              { width: `${Math.min(1, share) * 100}%`, backgroundColor: over ? overColor : color },
            ]}
          />
        </View>
        <Text
          style={styles.meterFoot}
        >{`${usedLabel} ${formatAed(used)} of ${formatAed(total)}`}</Text>
      </View>
      <Body muted>{note}</Body>
    </Card>
  );
}

function Legend({ items }: { items: readonly { key: string; label: string; color: string }[] }) {
  const styles = useStyles();
  return (
    <View style={styles.legend} importantForAccessibility="no-hide-descendants">
      {items.map((i) => (
        <View key={i.key} style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: i.color }]} />
          <Text style={styles.legendText}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colors, chart }) => ({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: PLOT_HEIGHT + 22,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  column: { width: '60%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  thin: { width: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  value: { fontSize: fontSize.caption, fontWeight: '700', color: colors.text },
  valueSmall: { fontSize: 10, color: colors.textMuted },
  baseline: { height: 1, backgroundColor: chart.baseline },
  labels: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  label: { flex: 1, textAlign: 'center', fontSize: fontSize.caption, color: colors.textMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: fontSize.caption, color: colors.text },
  meterPct: { fontSize: fontSize.hero, fontWeight: '800', color: colors.text },
  meterTrack: {
    height: 18,
    borderRadius: radius.lg,
    backgroundColor: chart.gridline,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  meterFill: { height: 18, borderRadius: radius.lg },
  meterFoot: { fontSize: fontSize.body, color: colors.textMuted, marginTop: spacing.xs },
}));
