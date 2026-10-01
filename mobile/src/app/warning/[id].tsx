import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { track } from '../../analytics/events';
import { Body, Card, Heading, Row, Screen } from '../../components/ui';
import { formatAed } from '../../domain/money';
import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';

export default function WarningDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { baseline } = usePrototype();
  const warning = baseline.warnings.find((w) => w.id === id);

  useEffect(() => {
    if (warning) track('warning_opened', { warning_type: warning.kind });
  }, [warning]);

  if (!warning) {
    return (
      <Screen testID="warning-screen">
        <Body>{t.warning.notFound}</Body>
      </Screen>
    );
  }

  const reason =
    warning.kind === 'commitment-due-soon'
      ? t.warning.reasons['commitment-due-soon'](warning.commitmentName ?? '')
      : t.warning.reasons[warning.kind];

  return (
    <Screen testID="warning-screen">
      <Heading>{t.warning.kinds[warning.kind]}</Heading>
      <Card>
        <Row label={t.warning.when} value={t.commitments.due(warning.dayOffset)} />
        <Row label={t.warning.amount} value={formatAed(warning.amount)} strong />
      </Card>
      <Card>
        <Heading>{t.warning.why}</Heading>
        <Body>{reason}</Body>
      </Card>
      <Card tone="info">
        <Heading>{t.warning.action}</Heading>
        <Body>{t.warning.actions[warning.kind]}</Body>
      </Card>
    </Screen>
  );
}
