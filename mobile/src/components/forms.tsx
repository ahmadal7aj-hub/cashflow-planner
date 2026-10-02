import { Pressable, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { fontSize, minTouchTarget, radius, spacing } from '../theme/tokens';
import { Body } from './ui';

const useStyles = makeStyles(({ colors }) => ({
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  inputError: { borderColor: colors.dangerText, borderWidth: 1.5 },
  error: { color: colors.dangerText, fontSize: fontSize.caption },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.infoBg },
  chipText: { fontSize: fontSize.body, color: colors.text },
  chipTextSelected: { fontWeight: '700', color: colors.primary },
}));

export function Field({
  label,
  value,
  onChangeText,
  error,
  hint,
  keyboardType = 'default',
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string | undefined;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  testID: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Body muted>{hint}</Body> : null}
      <TextInput
        testID={`input-${testID}`}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" testID={`error-${testID}`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

/** Single-choice chips (a radio group). Selection is shown by weight and a check, not colour alone. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
  testID: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              testID={`${testID}-${o.value}`}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {selected ? `✓ ${o.label}` : o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
