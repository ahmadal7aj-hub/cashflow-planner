import { useState } from 'react';
import { View } from 'react-native';

import { addDays, daysBetween, formatDate, type ISODate } from '../domain/dates';
import { MAX_REMINDER_DAYS, REMINDER_PRESETS } from '../domain/reminders';
import { t } from '../i18n/strings';
import { DateField } from './dates';
import { ChipGroup, type ChipOption } from './forms';
import { Body } from './ui';

type Mode = 'none' | 'custom' | `${number}`;

function modeFor(daysBefore: number | undefined): Mode {
  if (daysBefore === undefined) return 'none';
  return REMINDER_PRESETS.some((p) => p.daysBefore === daysBefore) ? `${daysBefore}` : 'custom';
}

/**
 * Choose when to be reminded about a bill: a preset (on the day, 1 day, 3 days, 1 week, 2 weeks before)
 * or an exact date. Reminders are stored as "days before the due date" so they carry over to every repeat.
 */
export function ReminderPicker({
  dueDate,
  today,
  value,
  onChange,
  error,
}: {
  dueDate: ISODate | null;
  today: ISODate;
  /** Days before the due date, or undefined for no reminder. */
  value: number | undefined;
  onChange: (daysBefore: number | undefined) => void;
  error?: string | undefined;
}) {
  const [mode, setMode] = useState<Mode>(modeFor(value));
  const [customDate, setCustomDate] = useState<ISODate | null>(
    value !== undefined && dueDate ? addDays(dueDate, -value) : null,
  );

  const options: ChipOption<Mode>[] = [
    { value: 'none', label: t.reminder.none },
    ...REMINDER_PRESETS.map((p) => ({ value: `${p.daysBefore}` as Mode, label: p.label })),
    { value: 'custom', label: t.reminder.custom },
  ];

  const choose = (m: Mode) => {
    setMode(m);
    if (m === 'none') onChange(undefined);
    else if (m === 'custom')
      onChange(customDate && dueDate ? daysBetween(customDate, dueDate) : undefined);
    else onChange(Number(m));
  };

  const pickCustom = (iso: ISODate) => {
    setCustomDate(iso);
    if (dueDate) onChange(Math.min(MAX_REMINDER_DAYS, Math.max(0, daysBetween(iso, dueDate))));
  };

  const preview =
    dueDate && value !== undefined
      ? t.reminder.summary(formatDate(addDays(dueDate, -value)), value)
      : null;

  return (
    <View style={{ gap: 8 }}>
      <ChipGroup
        label={t.reminder.label}
        testID="reminder"
        value={mode}
        onChange={choose}
        options={options}
      />
      {mode === 'custom' && (
        <DateField
          label={t.reminder.pickLabel}
          testID="reminder-date"
          value={customDate}
          today={today}
          onChange={pickCustom}
          minDate={today}
          {...(dueDate ? { maxDate: dueDate } : {})}
          error={error}
        />
      )}
      {preview ? (
        <Body muted testID="reminder-summary">
          {preview}
        </Body>
      ) : null}
    </View>
  );
}
