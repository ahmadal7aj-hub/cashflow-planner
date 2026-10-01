import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { appEnvironment, environmentLabel, isProduction } from '../config/environment';
import { t } from '../i18n/strings';
import { PrototypeProvider } from '../state/PrototypeContext';
import { colors, fontSize, spacing } from '../theme/tokens';

export default function RootLayout() {
  return (
    <PrototypeProvider>
      {!isProduction(appEnvironment) && (
        <View style={styles.banner} testID="environment-banner">
          <Text style={styles.bannerText}>{environmentLabel(appEnvironment)}</Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: t.onboarding.title }} />
        <Stack.Screen name="commitments" options={{ title: t.commitments.title }} />
        <Stack.Screen name="dashboard" options={{ title: t.dashboard.title }} />
        <Stack.Screen name="warning/[id]" options={{ title: t.warning.title }} />
        <Stack.Screen name="explain/[metric]" options={{ title: t.explain.title }} />
        <Stack.Screen name="scenario" options={{ title: t.scenario.title }} />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      </Stack>
      <StatusBar style="auto" />
    </PrototypeProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.envBanner,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  bannerText: { color: '#fff', fontWeight: '600', fontSize: fontSize.caption, letterSpacing: 1 },
});
