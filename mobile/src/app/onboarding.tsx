import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { track } from '../analytics/events';
import { Body, Button, Heading, Screen } from '../components/ui';
import { formatAed, parseAmountToFils, type Fils } from '../domain/money';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';
import { colors, fontSize, minTouchTarget, radius, spacing } from '../theme/tokens';

type Field = 'balance' | 'savings' | 'buffer';

function toInput(fils: Fils): string {
  return formatAed(fils).replace('AED ', '').replace(/,/g, '');
}

export default function Onboarding() {
  const router = useRouter();
  const { balance, savingsReserve, safetyBuffer, setNumbers } = usePrototype();
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const [values, setValues] = useState<Record<Field, string>>({
    balance: toInput(balance),
    savings: toInput(savingsReserve),
    buffer: toInput(safetyBuffer),
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const submit = () => {
    const parsed = {
      balance: parseAmountToFils(values.balance),
      savings: parseAmountToFils(values.savings),
      buffer: parseAmountToFils(values.buffer),
    };
    const next: Partial<Record<Field, string>> = {};
    (Object.keys(parsed) as Field[]).forEach((f) => {
      const r = parsed[f];
      if (!r.ok)
        next[f] = r.reason === 'empty' ? t.onboarding.errorEmpty : t.onboarding.errorInvalid;
    });
    setErrors(next);
    if (!parsed.balance.ok || !parsed.savings.ok || !parsed.buffer.ok) return;

    setNumbers({
      balance: parsed.balance.fils,
      savingsReserve: parsed.savings.fils,
      safetyBuffer: parsed.buffer.fils,
    });
    const seconds = (Date.now() - startedAt.current) / 1000;
    track('onboarding_completed', {
      steps_completed: 3,
      duration_bucket: seconds < 30 ? 'lt_30s' : seconds < 120 ? 'lt_2m' : 'gte_2m',
    });
    router.push('/commitments');
  };

  const field = (key: Field, label: string, hint?: string) => (
    <View style={styles.field}>
      <Text style={styles.label} nativeID={`${key}-label`}>
        {label}
      </Text>
      {hint ? <Body muted>{hint}</Body> : null}
      <TextInput
        testID={`input-${key}`}
        value={values[key]}
        onChangeText={(v) => setValues((p) => ({ ...p, [key]: v }))}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        accessibilityHint={errors[key]}
        style={[styles.input, errors[key] ? styles.inputError : null]}
      />
      {errors[key] ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" testID={`error-${key}`}>
          {errors[key]}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen testID="onboarding-screen">
      <Heading>{t.onboarding.title}</Heading>
      <Body muted>{t.onboarding.intro}</Body>
      {field('balance', t.onboarding.balance)}
      {field('savings', t.onboarding.savings)}
      {field('buffer', t.onboarding.buffer, t.onboarding.bufferHint)}
      <Button label={t.continue} onPress={submit} testID="onboarding-continue" />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  inputError: { borderColor: colors.dangerText },
  error: { color: colors.dangerText, fontSize: fontSize.caption },
});
