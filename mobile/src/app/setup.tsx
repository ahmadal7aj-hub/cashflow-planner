import { useRouter } from 'expo-router';
import { useState } from 'react';

import { DateField } from '../components/dates';
import { Field } from '../components/forms';
import { Body, Button, Heading, Screen } from '../components/ui';
import type { ISODate } from '../domain/dates';
import { parseAmountToFils } from '../domain/money';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

/** First-run questions about savings. Zero is allowed for both amounts. */
export default function Setup() {
  const router = useRouter();
  const { today, completeSetup } = usePrototype();
  const [opening, setOpening] = useState('0');
  const [date, setDate] = useState<ISODate | null>(today);
  const [target, setTarget] = useState('0');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const save = () => {
    const o = parseAmountToFils(opening);
    const g = parseAmountToFils(target);
    const next: Record<string, string | undefined> = {};
    if (!o.ok) next.opening = t.setup.errorAmount;
    if (!g.ok) next.target = t.setup.errorAmount;
    if (date === null) next.date = t.setup.errorDate;
    else if (date > today) next.date = t.setup.errorFuture;
    setErrors(next);
    if (Object.keys(next).length > 0 || !o.ok || !g.ok || date === null) return;
    completeSetup({ opening: o.fils, openingDate: date, target: g.fils });
    router.replace('/income');
  };

  return (
    <Screen testID="setup-screen">
      <Heading>{t.setup.title}</Heading>
      <Body muted>{t.setup.intro}</Body>
      <Field
        label={t.setup.openingLabel}
        hint={t.setup.openingHint}
        testID="opening"
        value={opening}
        onChangeText={setOpening}
        error={errors.opening}
        keyboardType="decimal-pad"
      />
      <DateField
        label={t.setup.dateLabel}
        value={date}
        today={today}
        onChange={setDate}
        error={errors.date}
        maxDate={today}
        testID="opening-date"
      />
      <Field
        label={t.setup.targetLabel}
        hint={t.setup.targetHint}
        testID="target"
        value={target}
        onChangeText={setTarget}
        error={errors.target}
        keyboardType="decimal-pad"
      />
      <Button label={t.setup.save} onPress={save} testID="setup-save" />
    </Screen>
  );
}
