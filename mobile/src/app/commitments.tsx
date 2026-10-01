import { useRouter } from 'expo-router';

import { Body, Button, Card, Heading, Row, Screen } from '../components/ui';
import { formatAed } from '../domain/money';
import { SAMPLE_COMMITMENTS } from '../domain/sampleData';
import { t } from '../i18n/strings';

export default function Commitments() {
  const router = useRouter();
  return (
    <Screen testID="commitments-screen">
      <Heading>{t.commitments.title}</Heading>
      <Body muted>{t.commitments.intro}</Body>
      {SAMPLE_COMMITMENTS.map((c) => (
        <Card key={c.id}>
          <Row label={c.name} value={formatAed(c.amount)} strong />
          <Body muted>
            {t.commitments.due(c.dueInDays)} ·{' '}
            {c.essential ? t.commitments.essential : t.commitments.optional}
          </Body>
        </Card>
      ))}
      <Button
        label={t.commitments.toDashboard}
        testID="commitments-continue"
        onPress={() => router.push('/dashboard')}
      />
    </Screen>
  );
}
