import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

import { track } from '../analytics/events';
import { ChipGroup } from '../components/forms';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';
import { useThemeMode, type ThemeMode } from '../theme/ThemeProvider';

export default function Settings() {
  const router = useRouter();
  // Feedback for the data buttons, so a tap never looks like it did nothing.
  const [dataMessage, setDataMessage] = useState<string | null>(null);

  const { mode, setMode } = useThemeMode();
  const { loadSampleData, exportJson } = usePrototype();

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
        label={t.shared.linkAccount}
        variant="secondary"
        onPress={() => router.push('/link')}
        testID="open-link"
      />
      <Button
        label={t.settings.editNumbers}
        variant="secondary"
        onPress={() => router.push('/onboarding')}
        testID="edit-numbers"
      />
      <Card>
        <Heading>{t.settings.loadSample}</Heading>
        <Body muted>{t.settings.loadSampleHint}</Body>
        <Button
          label={t.settings.loadSample}
          variant="secondary"
          onPress={() => {
            loadSampleData();
            setDataMessage(t.settings.loadSampleDone);
          }}
          testID="load-sample"
        />
      </Card>
      <Card>
        <Heading>{t.settings.data}</Heading>
        <Body muted>{t.settings.notAvailable}</Body>
        <Button
          label={t.settings.export}
          variant="secondary"
          onPress={async () => {
            track('export_requested', { format: 'json_share_sheet' });
            try {
              // The user chooses where the copy goes (Files, Notes, email...). Nothing is sent by the app.
              await Share.share({ title: t.settings.exportTitle, message: exportJson() });
              setDataMessage(t.settings.exportMessage);
            } catch {
              setDataMessage(t.settings.exportFailed);
            }
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
