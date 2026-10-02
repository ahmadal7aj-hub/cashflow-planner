import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  addMonths,
  daysBetween,
  daysInMonth,
  formatDate,
  formatMonthYear,
  parseISO,
  relativeDays,
  toISO,
  weekdayMondayFirst,
  type ISODate,
} from '../domain/dates';
import { t } from '../i18n/strings';
import { fontSize, minTouchTarget, radius, spacing } from '../theme/tokens';
import { makeStyles } from '../theme/ThemeProvider';
import { Body } from './ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A month calendar. Tap a day to choose it. Days outside `minDate` / `maxDate` are disabled. */
export function DatePicker({
  value,
  today,
  onChange,
  minDate,
  maxDate,
  testID = 'date-picker',
}: {
  value: ISODate | null;
  today: ISODate;
  onChange: (iso: ISODate) => void;
  minDate?: ISODate;
  maxDate?: ISODate;
  testID?: string;
}) {
  const styles = useStyles();
  const start = parseISO(value ?? today) ?? parseISO(today)!;
  const [view, setView] = useState({ y: start.y, m: start.m });

  const firstOfMonth = toISO(view.y, view.m, 1);
  const lead = weekdayMondayFirst(firstOfMonth);
  const total = daysInMonth(view.y, view.m);
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const go = (delta: number) => {
    const next = addMonths(firstOfMonth, delta);
    const p = parseISO(next)!;
    setView({ y: p.y, m: p.m });
  };

  return (
    <View style={styles.picker} testID={testID}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dates.previousMonth}
          onPress={() => go(-1)}
          style={styles.navButton}
          testID="date-prev"
        >
          <Text style={styles.navText}>{'‹'}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.monthTitle}>
          {formatMonthYear(view.y, view.m)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dates.nextMonth}
          onPress={() => go(1)}
          style={styles.navButton}
          testID="date-next"
        >
          <Text style={styles.navText}>{'›'}</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={styles.row}>
          {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
            if (day === null) return <View key={i} style={styles.cell} />;
            const iso = toISO(view.y, view.m, day);
            const disabled =
              (minDate !== undefined && daysBetween(minDate, iso) < 0) ||
              (maxDate !== undefined && daysBetween(maxDate, iso) > 0);
            const selected = iso === value;
            const isToday = iso === today;
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${formatDate(iso)}${isToday ? `, ${t.dates.today}` : ''}`}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onChange(iso)}
                style={[
                  styles.cell,
                  styles.day,
                  isToday && styles.today,
                  selected && styles.selected,
                  disabled && styles.disabled,
                ]}
                testID={`date-day-${iso}`}
              >
                <Text style={[styles.dayText, selected && styles.selectedText]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** A labelled button showing the chosen date; tapping it opens the calendar inline. */
export function DateField({
  label,
  value,
  today,
  onChange,
  onClear,
  error,
  hint,
  minDate,
  maxDate,
  testID,
}: {
  label: string;
  value: ISODate | null;
  today: ISODate;
  onChange: (iso: ISODate) => void;
  /** When given, a "clear" button is shown for optional dates. */
  onClear?: () => void;
  error?: string | undefined;
  hint?: string;
  minDate?: ISODate;
  maxDate?: ISODate;
  testID: string;
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const shown = value
    ? `${formatDate(value)} · ${relativeDays(daysBetween(today, value))}`
    : t.dates.choose;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Body muted>{hint}</Body> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : t.dates.choose}`}
        accessibilityHint={open ? undefined : t.dates.tapToChange}
        onPress={() => setOpen((o) => !o)}
        style={[styles.dateButton, error ? styles.dateError : null]}
        testID={`${testID}-toggle`}
      >
        <Text style={styles.dateButtonText}>{shown}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <DatePicker
          value={value}
          today={today}
          minDate={minDate}
          maxDate={maxDate}
          testID={`${testID}-picker`}
          onChange={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      )}
      {onClear && value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dates.clear}
          onPress={onClear}
          style={styles.clear}
          testID={`${testID}-clear`}
        >
          <Text style={styles.clearText}>{t.dates.clear}</Text>
        </Pressable>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" testID={`error-${testID}`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, chart: chartColors }) => ({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  dateButton: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateError: { borderColor: colors.dangerText },
  dateButtonText: { fontSize: fontSize.body, color: colors.text },
  chevron: { fontSize: 12, color: colors.textMuted },
  clear: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
  clearText: { fontSize: fontSize.body, color: colors.primary, fontWeight: '600' },
  error: { color: colors.dangerText, fontSize: fontSize.caption },

  picker: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 28, color: colors.primary },
  monthTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.caption,
    color: colors.textMuted,
    paddingVertical: 4,
  },
  cell: { flex: 1, aspectRatio: 1, margin: 1 },
  day: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  today: { borderWidth: 1, borderColor: colors.primary },
  selected: { backgroundColor: colors.primary },
  disabled: { opacity: 0.35 },
  dayText: { fontSize: fontSize.body, color: colors.text },
  selectedText: { color: colors.onPrimary, fontWeight: '700' },
}));
