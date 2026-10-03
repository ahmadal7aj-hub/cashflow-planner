import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Field } from '../components/forms';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';

export default function LinkAccount() {
  const router = useRouter();
  const { sharing, linkPartner, unlinkPartner } = usePrototype();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = () => {
    if (username.trim().length < 3) {
      setError(t.shared.errorUsername);
      return;
    }
    linkPartner(username);
    setError(undefined);
  };

  if (sharing.linked) {
    return (
      <Screen testID="link-screen">
        <Heading>{t.shared.linkedTitle}</Heading>
        <Card tone="info" testID="link-status">
          <Body>{t.shared.linkedWith(sharing.partnerUsername)}</Body>
          <Body muted>{t.shared.linkedExplain}</Body>
        </Card>
        <Button
          label={t.shared.openShared}
          onPress={() => router.navigate('/shared')}
          testID="link-open-shared"
        />
        <Button
          label={t.shared.unlink}
          variant="secondary"
          onPress={unlinkPartner}
          testID="link-unlink"
        />
        <Body muted>{t.shared.previewNote}</Body>
      </Screen>
    );
  }

  return (
    <Screen testID="link-screen">
      <Heading>{t.shared.linkTitle}</Heading>
      <Body muted>{t.shared.linkIntro}</Body>
      <Field
        label={t.shared.usernameLabel}
        hint={t.shared.usernameHint}
        value={username}
        onChangeText={setUsername}
        error={error}
        testID="partner-username"
      />
      <Button label={t.shared.linkButton} onPress={submit} testID="link-submit" />
      <Body muted>{t.shared.previewNote}</Body>
    </Screen>
  );
}
