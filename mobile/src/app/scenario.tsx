import { useEffect } from 'react';

import { track } from '../analytics/events';
import { Body, Button, Card, Heading, Row, Screen } from '../components/ui';
import { formatAed } from '../domain/money';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

export default function Scenario() {
  const { baseline, scenario, scenarioOn, setScenarioOn } = usePrototype();

  // The what-if is local to this screen: leaving it discards the scenario (never touches baseline).
  useEffect(() => () => setScenarioOn(false), [setScenarioOn]);

  const toggle = () => {
    if (!scenarioOn) track('scenario_created', { scenario_type: 'purchase' });
    setScenarioOn(!scenarioOn);
  };

  return (
    <Screen testID="scenario-screen">
      <Heading>{t.scenario.title}</Heading>
      <Body muted>{t.scenario.intro}</Body>

      <Card testID="scenario-baseline">
        <Heading>{t.scenario.baseline}</Heading>
        <Row label={t.scenario.safe} value={formatAed(baseline.safeToSpend)} strong />
        <Row label={t.scenario.balance} value={formatAed(baseline.forecastBalance)} />
      </Card>

      {scenarioOn && (
        <Card tone={scenario.shortfall > 0 ? 'danger' : 'info'} testID="scenario-result">
          <Heading>{t.scenario.withPurchase}</Heading>
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
        label={scenarioOn ? t.scenario.toggleOn : t.scenario.toggleOff}
        onPress={toggle}
        testID="scenario-toggle"
      />
      <Body muted>{t.scenario.isolated}</Body>
    </Screen>
  );
}
