import { useEffect, useState } from 'react';

import { track } from '../analytics/events';
import { Body, Button, Card, Heading, Row, Screen } from '../components/ui';
import { Field } from '../components/forms';
import { formatAed, parseAmountToFils } from '../domain/money';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

export default function Scenario() {
  const { baseline, scenario, scenarioOn, setScenarioOn, scenarioItem, setScenarioItem } =
    usePrototype();
  const [name, setName] = useState(scenarioItem.label);
  const [price, setPrice] = useState(String(scenarioItem.amount / 100));
  const parsed = parseAmountToFils(price);
  const priceError = !parsed.ok || parsed.fils <= 0 ? t.scenario.errorPrice : undefined;

  const onName = (v: string) => {
    setName(v);
    setScenarioItem({
      ...scenarioItem,
      label: v.trim() === '' ? t.scenario.defaultName : v.trim(),
    });
  };
  const onPrice = (v: string) => {
    setPrice(v);
    const r = parseAmountToFils(v);
    if (r.ok && r.fils > 0) setScenarioItem({ ...scenarioItem, amount: r.fils });
  };

  // The what-if is local to this screen: leaving it discards the scenario (never touches baseline).
  useEffect(() => () => setScenarioOn(false), [setScenarioOn]);

  const toggle = () => {
    if (!scenarioOn && priceError !== undefined) return;
    if (!scenarioOn) track('scenario_created', { scenario_type: 'purchase' });
    setScenarioOn(!scenarioOn);
  };

  return (
    <Screen testID="scenario-screen">
      <Heading>{t.scenario.title}</Heading>
      <Body muted>{t.scenario.intro}</Body>

      <Card testID="scenario-item">
        <Field
          label={t.scenario.itemLabel}
          value={name}
          onChangeText={onName}
          testID="scenario-name"
        />
        <Field
          label={t.scenario.priceLabel}
          hint={t.scenario.priceHint}
          value={price}
          onChangeText={onPrice}
          keyboardType="decimal-pad"
          error={priceError}
          testID="scenario-price"
        />
      </Card>

      <Card testID="scenario-baseline">
        <Heading>{t.scenario.baseline}</Heading>
        <Row label={t.scenario.safe} value={formatAed(baseline.safeToSpend)} strong />
        <Row label={t.scenario.balance} value={formatAed(baseline.forecastBalance)} />
      </Card>

      {scenarioOn && (
        <Card tone={scenario.shortfall > 0 ? 'danger' : 'info'} testID="scenario-result">
          <Heading>{t.scenario.withPurchase(scenarioItem.label)}</Heading>
          <Row label={t.scenario.safe} value={formatAed(scenario.safeToSpend)} strong />
          <Row label={t.scenario.balance} value={formatAed(scenario.forecastBalance)} />
          {scenario.shortfall > 0 && (
            <Body>
              {t.scenario.shortfallNote} {t.dashboard.shortfall(formatAed(scenario.shortfall))}
            </Body>
          )}
        </Card>
      )}

      <Button
        label={
          scenarioOn
            ? t.scenario.toggleOn
            : t.scenario.toggleOff(scenarioItem.label, formatAed(scenarioItem.amount))
        }
        onPress={toggle}
        testID="scenario-toggle"
      />
      <Body muted>{t.scenario.isolated}</Body>
    </Screen>
  );
}
