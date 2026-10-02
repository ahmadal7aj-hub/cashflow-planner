import { useLocalSearchParams } from 'expo-router';

import { Body, Card, Heading, Row, Screen } from '../../components/ui';
import { formatAed } from '../../domain/money';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

type Metric = 'safe' | 'daily' | 'forecast';

function isMetric(value: string | undefined): value is Metric {
  return value === 'safe' || value === 'daily' || value === 'forecast';
}

export default function Explain() {
  const { metric } = useLocalSearchParams<{ metric: string }>();
  const { baseline: f } = usePrototype();

  if (!isMetric(metric)) {
    return (
      <Screen testID="explain-screen">
        <Body>{t.explain.notFound}</Body>
      </Screen>
    );
  }

  const result =
    metric === 'safe' ? f.safeToSpend : metric === 'daily' ? f.dailySafe : f.forecastBalance;
  const r = t.explain.rows;

  return (
    <Screen testID="explain-screen">
      <Heading>{t.explain.metrics[metric]}</Heading>
      <Card>
        <Heading>{t.explain.inputs}</Heading>
        <Row label={r.cash} value={formatAed(f.availableCash)} />
        <Row label={r.income} value={formatAed(f.expectedIncome)} />
        <Row label={r.commitments} value={`-${formatAed(f.reservedCommitments)}`} />
        <Row label={r.savings} value={`-${formatAed(f.savingsReserve)}`} />
        {metric !== 'forecast' && <Row label={r.buffer} value={`-${formatAed(f.safetyBuffer)}`} />}
        <Row label={r.planned} value={`-${formatAed(f.plannedExpenses)}`} />
        {metric === 'daily' && <Row label={r.days} value={String(f.horizonDays)} />}
        <Row label={r.result} value={formatAed(result)} strong />
      </Card>
      <Card tone="info">
        <Heading>{t.explain.formula}</Heading>
        <Body>{t.explain.formulas[metric]}</Body>
      </Card>
      <Card>
        <Heading>{t.explain.assumptions}</Heading>
        <Body muted>{t.explain.assumptionsText}</Body>
      </Card>
    </Screen>
  );
}
