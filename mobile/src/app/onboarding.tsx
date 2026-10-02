import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { track } from '../analytics/events';
import { Body, Button, Heading, Screen } from '../components/ui';
import { Field } from '../components/forms';
import { formatAed, parseAmountToFils, type Fils } from '../domain/money';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

type FieldKey = 'balance' | 'buffer';

function toInput(fils: Fils): string {
  return formatAed(fils).replace('AED ', '').replace(/,/g, '');
}

export default function Onboarding() {
  const router = useRouter();
  const { plan, setNumbers, claimOnboardingCompletion } = usePrototype();
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    balance: toInput(plan.availableCash),
    buffer: toInput(plan.safetyBuffer),
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const submit = () => {
    const parsed = {
      balance: parseAmountToFils(values.balance),
      buffer: parseAmountToFils(values.buffer),
    };
    const next: Partial<Record<FieldKey, string>> = {};
    (Object.keys(parsed) as FieldKey[]).forEach((f) => {
      const r = parsed[f];
      if (!r.ok)
        next[f] = r.reason === 'empty' ? t.onboarding.errorEmpty : t.onboarding.errorInvalid;
    });
    setErrors(next);
    if (!parsed.balance.ok || !parsed.buffer.ok) return;

    setNumbers({ balance: parsed.balance.fils, safetyBuffer: parsed.buffer.fils });
    const seconds = (Date.now() - startedAt.current) / 1000;
    if (claimOnboardingCompletion()) {
      track('onboarding_completed', {
        steps_completed: 2,
        duration_bucket: seconds < 30 ? 'lt_30s' : seconds < 120 ? 'lt_2m' : 'gte_2m',
      });
    }
    router.push('/commitments');
  };

  return (
    <Screen testID="onboarding-screen">
      <Heading>{t.onboarding.title}</Heading>
      <Body muted>{t.onboarding.intro}</Body>
      <Field
        label={t.onboarding.balance}
        testID="balance"
        value={values.balance}
        onChangeText={(v) => setValues((p) => ({ ...p, balance: v }))}
        error={errors.balance}
        keyboardType="decimal-pad"
      />
      <Field
        label={t.onboarding.buffer}
        hint={t.onboarding.bufferHint}
        testID="buffer"
        value={values.buffer}
        onChangeText={(v) => setValues((p) => ({ ...p, buffer: v }))}
        error={errors.buffer}
        keyboardType="decimal-pad"
      />
      <Button label={t.continue} onPress={submit} testID="onboarding-continue" />
    </Screen>
  );
}
