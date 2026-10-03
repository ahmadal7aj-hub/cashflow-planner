import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { track } from '../analytics/events';
import { Body, Button, Card, HeroCard, Screen, type IconName } from '../components/ui';
import { t } from '../i18n/strings';
import { usePrototype } from '../state/PrototypeContext';
import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { fontSize, radius, spacing } from '../theme/tokens';

const useStyles = makeStyles(({ colors }) => ({
  space: { height: spacing.lg },
  emblem: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.heroGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.title + 4,
    fontWeight: '800',
    color: colors.heroText,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: fontSize.body + 1, color: colors.heroMuted, lineHeight: 24 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { flex: 1 },
}));

const BENEFITS: readonly { icon: IconName; text: string }[] = [
  { icon: 'shield-checkmark-outline', text: t.welcome.benefit1 },
  { icon: 'calendar-outline', text: t.welcome.benefit2 },
  { icon: 'bulb-outline', text: t.welcome.benefit3 },
];

export default function Welcome() {
  const router = useRouter();
  const { plan } = usePrototype();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Screen testID="home-screen">
      <View style={styles.space} />
      <HeroCard>
        <View style={styles.emblem} importantForAccessibility="no-hide-descendants">
          <Ionicons name="wallet" size={32} color={colors.heroBg} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t.appName}
        </Text>
        <Text style={styles.tagline}>{t.tagline}</Text>
      </HeroCard>

      <Card>
        {BENEFITS.map((b) => (
          <View key={b.icon} style={styles.benefit}>
            <View style={styles.benefitIcon} importantForAccessibility="no-hide-descendants">
              <Ionicons name={b.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <Body>{b.text}</Body>
            </View>
          </View>
        ))}
      </Card>

      <Card tone="info">
        <Body>{t.prototypeNote}</Body>
      </Card>
      <Button
        label={t.start}
        icon="arrow-forward"
        testID="start-button"
        onPress={() => {
          track('onboarding_started', { platform: Platform.OS });
          router.push(plan.setupDone ? '/dashboard' : '/setup');
        }}
      />
    </Screen>
  );
}
