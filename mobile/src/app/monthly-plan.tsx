import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Field } from '../components/forms';
import { Body, Button, Card, Heading, Row, Screen } from '../components/ui';
import { formatAed, parseAmountToFils } from '../domain/money';
import { monthlySplit } from '../domain/monthlyPlan';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

export default function MonthlyPlan() {
  const router = useRouter();
  const { plan, setMonthlySavings } = usePrototype();
  const [text, setText] = useState(String((plan.monthlySavings ?? 0) / 100));
  const [saved, setSaved] = useState(false);

  // The split shown is a live preview of what is typed; it is stored only when the user saves.
  const parsed = parseAmountToFils(text);
  const error = parsed.ok ? undefined : t.monthlyPlan.errorSave;
  const split = monthlySplit({ ...plan, monthlySavings: parsed.ok ? parsed.fils : 0 });
  const totalSet = split.generalSavings + split.goalSavings + split.investing;

  const onSave = () => {
    if (!parsed.ok) return;
    setMonthlySavings(parsed.fils);
    setSaved(true);
  };

  return (
    <Screen testID="monthly-plan-screen">
      <Heading>{t.monthlyPlan.title}</Heading>
      <Body muted>{t.monthlyPlan.intro}</Body>

      <Card testID="plan-income">
        <Heading>{t.monthlyPlan.step1}</Heading>
        <Heading>{formatAed(split.income)}</Heading>
        <Body muted>{t.monthlyPlan.step1Note}</Body>
        <Button
          label={t.monthlyPlan.editIncome}
          variant="secondary"
          onPress={() => router.push('/commitments')}
          testID="plan-edit-income"
        />
      </Card>

      <Card testID="plan-save">
        <Heading>{t.monthlyPlan.step2}</Heading>
        <Field
          label={t.monthlyPlan.saveLabel}
          hint={t.monthlyPlan.saveHint}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setSaved(false);
          }}
          keyboardType="decimal-pad"
          error={error}
          testID="monthly-savings"
        />
        <Row label={t.monthlyPlan.goalsLine} value={formatAed(split.goalSavings)} />
        <Row label={t.monthlyPlan.investLine} value={formatAed(split.investing)} />
        <Row label={t.monthlyPlan.totalSet} value={formatAed(totalSet)} strong />
      </Card>

      <Card tone={split.leftToSpend < 0 ? 'danger' : 'info'} testID="plan-left">
        <Heading>{t.monthlyPlan.step3}</Heading>
        <Heading>{formatAed(split.leftToSpend)}</Heading>
        <Body muted>{t.monthlyPlan.leftNote}</Body>
        {split.leftToSpend < 0 ? <Body>{t.monthlyPlan.setAsideMore}</Body> : null}
        <Row label={t.monthlyPlan.plannedLine} value={formatAed(split.plannedSpending)} />
        <Row
          label={split.room < 0 ? t.monthlyPlan.overLine : t.monthlyPlan.roomLine}
          value={formatAed(Math.abs(split.room))}
          strong
        />
        {split.room < 0 && split.leftToSpend >= 0 ? <Body>{t.monthlyPlan.overNote}</Body> : null}
      </Card>

      <Button label={t.monthlyPlan.save} onPress={onSave} testID="monthly-plan-save" />
      {saved ? <Body testID="monthly-plan-saved">{t.monthlyPlan.saved}</Body> : null}
    </Screen>
  );
}
