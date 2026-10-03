import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

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
        <Heading>{t.account.profileTitle}</Heading>
        <Body muted>{t.account.usernameLabel}</Body>
        <Body testID="profile-username">{account.user.username || '-'}</Body>
        <Body muted>{t.account.emailLabel}</Body>
        <Body testID="profile-email">{account.user.email}</Body>
        <Body muted>{t.account.usernameHelp}</Body>
        <Body muted>{t.account.noNamePhone}</Body>
        {account.user.username ? (
          <Button
            label={t.account.shareUsername}
            variant="secondary"
            onPress={() => {
              void Share.share({ message: t.account.shareMessage(account.user.username) });
            }}
            testID="profile-share-username"
          />
        ) : null}
      </Card>
      {account.backend?.kind === 'dev-server' ? (
        <Body muted testID="dev-server-note">
          {t.account.devServer}
        </Body>
      ) : null}
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
