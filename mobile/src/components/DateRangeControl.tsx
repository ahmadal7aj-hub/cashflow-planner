import { useMemo, useState } from 'react';
import { Text } from 'react-native';

import {
  RANGE_PRESETS,
  presetRange,
  validateRange,
  type DateRange,
  type RangeError,
  type RangePreset,
} from '../domain/dashboardRange';
import { formatDate, type ISODate } from '../domain/dates';
import { t } from '../i18n/strings';
import { useTheme } from '../theme/ThemeProvider';
import { ChipGroup, Field } from './forms';
import { Body, Card } from './ui';

export interface DateRangeState {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  customError: RangeError | null;
  /** The dates actually used: the preset, or a valid custom range (the current month while a custom range is invalid). */
  range: DateRange;
}

/**
 * The date range every dashboard uses. Defaults to the current calendar month; presets are computed from today's
 * date on the device (the user's own calendar). Choosing dates only changes what is shown, never the records.
 */
export function useDateRange(today: ISODate): DateRangeState {
  const month = presetRange('current-month', today);
  const [preset, setPreset] = useState<RangePreset>('current-month');
  const [customFrom, setCustomFrom] = useState<string>(month.from);
  const [customTo, setCustomTo] = useState<string>(month.to);
  const customError = preset === 'custom' ? validateRange(customFrom, customTo) : null;
  const range = useMemo<DateRange>(() => {
    if (preset === 'custom') {
      return customError ? presetRange('current-month', today) : { from: customFrom, to: customTo };
    }
    return presetRange(preset, today);
  }, [preset, customFrom, customTo, customError, today]);
  return {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    customError,
    range,
  };
}

/** Preset chips, the custom date fields when chosen, and a line that states the exact dates being shown. */
export function DateRangeControl({
  state,
  idPrefix = 'range',
}: {
  state: DateRangeState;
  idPrefix?: string;
}) {
  const { colors } = useTheme();
  const { preset, customError } = state;
  return (
    <>
      <ChipGroup
        label={t.dashboardPage.rangeLabel}
        testID={idPrefix}
        value={preset}
        onChange={state.setPreset}
        options={RANGE_PRESETS.map((p) => ({ value: p, label: t.dashboardPage.presets[p] }))}
      />
      {preset === 'custom' ? (
        <Card testID={`${idPrefix}-custom`}>
          <Field
            label={t.dashboardPage.from}
            hint={t.dashboardPage.dateHint}
            testID={`${idPrefix}-from`}
            value={state.customFrom}
            onChangeText={state.setCustomFrom}
            error={customError === 'invalid-start' ? t.dashboardPage.errorStart : undefined}
          />
          <Field
            label={t.dashboardPage.to}
            testID={`${idPrefix}-to`}
            value={state.customTo}
            onChangeText={state.setCustomTo}
            error={customError === 'invalid-end' ? t.dashboardPage.errorEnd : undefined}
          />
          {customError === 'order' ? (
            <Text
              accessibilityLiveRegion="polite"
              testID={`${idPrefix}-error`}
              style={{ color: colors.dangerText }}
            >
              {t.dashboardPage.errorOrder}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <Body muted testID={`${idPrefix}-shown`}>
        {t.dashboardPage.showing(formatDate(state.range.from), formatDate(state.range.to))}
      </Body>
    </>
  );
}
