import { useRouter } from 'expo-router';
import { Platform, View } from 'react-native';

import { track } from '../analytics/events';
import { Body, Button, Card, Heading, Screen } from '../components/ui';
import { t } from '../i18n/strings';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen testID="home-screen">
      <View style={{ height: 48 }} />
      <Heading>{t.appName}</Heading>
      <Body>{t.tagline}</Body>
      <Card tone="info">
        <Body>{t.prototypeNote}</Body>
      </Card>
      <Button
        label={t.start}
        testID="start-button"
        onPress={() => {
          track('onboarding_started', { platform: Platform.OS });
          router.push('/onboarding');
        }}
      />
    </Screen>
  );
}
