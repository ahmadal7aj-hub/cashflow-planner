import { useRouter } from 'expo-router';
import { useState } from 'react';

import { track } from '../analytics/events';
import { ChipGroup } from '../components/forms';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { t } from '../i18n/strings';
import { useThemeMode, type ThemeMode } from '../theme/ThemeProvider';

export default function Settings() {
  const router = useRouter();
  // Feedback for the data buttons, so a tap never looks like it did nothing.
  const [dataMessage, setDataMessage] = useState<string | null>(null);

  const { mode, setMode } = useThemeMode();

  return (
    <Screen testID="settings-screen">
      <Card testID="appearance-card">
        <Heading>{t.settings.appearance}</Heading>
        <Body muted>{t.settings.appearanceHint}</Body>
        <ChipGroup<ThemeMode>
          label={t.settings.appearance}
          testID="appearance"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'system', label: t.settings.appearanceSystem },
            { value: 'light', label: t.settings.appearanceLight },
            { value: 'dark', label: t.settings.appearanceDark },
          ]}
        />
      </Card>
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
          onPress={() => {
            track('export_requested', { format: 'none_prototype' });
            setDataMessage(t.settings.exportMessage);
          }}
          testID="export-data"
        />
        <Button
          label={t.settings.delete}
          variant="secondary"
          onPress={() => setDataMessage(t.settings.deleteMessage)}
          testID="delete-data"
        />
        {dataMessage ? (
          <Body testID="data-message" accessibilityLiveRegion="polite">
            {dataMessage}
          </Body>
        ) : null}
      </Card>
    </Screen>
  );
}
