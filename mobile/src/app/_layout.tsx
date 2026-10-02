import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

import { appEnvironment, environmentLabel, isProduction } from '../config/environment';
import { t } from '../i18n/strings';
import { PrototypeProvider } from '../state/PrototypeContext';
import { makeStyles, ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { fontSize, spacing } from '../theme/tokens';

const useStyles = makeStyles(({ colors }) => ({
  banner: {
    backgroundColor: colors.envBanner,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  bannerText: { color: '#FFFFFF', fontWeight: '600', fontSize: fontSize.caption, letterSpacing: 1 },
}));

function ThemedStack() {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  return (
    <>
      {!isProduction(appEnvironment) && (
        <View style={styles.banner} testID="environment-banner">
          <Text style={styles.bannerText}>{environmentLabel(appEnvironment)}</Text>
        </View>
      )}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: t.onboarding.title }} />
        <Stack.Screen name="commitments" options={{ title: t.commitments.title }} />
        <Stack.Screen name="edit/[kind]/[id]" options={{ title: t.edit.titleEdit }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="warning/[id]" options={{ title: t.warning.title }} />
        <Stack.Screen name="explain/[metric]" options={{ title: t.explain.title }} />
        <Stack.Screen name="investments" options={{ title: t.investments.title }} />
        <Stack.Screen name="scenario" options={{ title: t.scenario.title }} />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PrototypeProvider>
        <ThemedStack />
      </PrototypeProvider>
    </ThemeProvider>
  );
}
