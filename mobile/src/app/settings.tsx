import { useRouter } from 'expo-router';

import { track } from '../analytics/events';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { t } from '../i18n/strings';

export default function Settings() {
  const router = useRouter();
  return (
    <Screen testID="settings-screen">
      <Card>
        <Heading>{t.settings.assumptions}</Heading>
        <Body>{t.settings.horizonRule}</Body>
        <Body>{t.settings.currency}</Body>
        <Body>{t.settings.language}</Body>
      </Card>
      <Button
        label={t.settings.editNumbers}
        variant="secondary"
        onPress={() => router.push('/onboarding')}
        testID="edit-numbers"
      />
      <Card>
        <Heading>{t.settings.data}</Heading>
        <Body muted>{t.settings.notAvailable}</Body>
        <Button
          label={t.settings.export}
          variant="secondary"
          onPress={() => track('export_requested', { format: 'none_prototype' })}
          testID="export-data"
        />
        <Button label={t.settings.delete} variant="secondary" onPress={() => undefined} />
      </Card>
    </Screen>
  );
}
