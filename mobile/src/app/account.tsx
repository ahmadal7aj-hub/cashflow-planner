import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { t } from '../i18n/strings';
import { useAccount } from '../state/AccountContext';

export default function Account() {
  const router = useRouter();
  const account = useAccount();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (account.status !== 'signedIn') {
    return (
      <Screen testID="account-screen">
        <Heading>{t.account.title}</Heading>
        <Body muted testID="account-unavailable">
          {t.account.notAvailable}
        </Body>
      </Screen>
    );
  }

  const signOut = async () => {
    try {
      await account.signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth.errors.unknown);
    }
  };

  return (
    <Screen testID="account-screen">
      <Heading>{t.account.title}</Heading>
      <Card testID="account-card">
        <Heading>{t.account.signedInAs(account.user.username || account.user.email)}</Heading>
        <Body muted>{t.account.emailLine(account.user.email)}</Body>
      </Card>
      <Button
        label={t.account.groups}
        onPress={() => router.push('/groups')}
        testID="account-groups"
      />
      {asking ? (
        <Card tone="warn" testID="signout-ask">
          <Body>{t.account.signOutAsk}</Body>
          <Button label={t.account.signOutConfirm} onPress={signOut} testID="signout-confirm" />
          <Button
            label={t.account.keep}
            variant="secondary"
            onPress={() => setAsking(false)}
            testID="signout-cancel"
          />
        </Card>
      ) : (
        <Button
          label={t.account.signOut}
          variant="secondary"
          onPress={() => setAsking(true)}
          testID="signout"
        />
      )}
      {error ? <Body>{error}</Body> : null}
    </Screen>
  );
}
