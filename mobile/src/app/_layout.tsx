import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { appEnvironment, environmentLabel, isProduction } from '../config/environment';
import { t } from '../i18n/strings';
import { AuthFlow } from '../auth/AuthFlow';
import { NotificationsProvider } from '../notifications/NotificationsContext';
import { AccountProvider, useAccount, useUserId } from '../state/AccountContext';
import { PrototypeProvider } from '../state/PrototypeContext';
import { SharingProvider } from '../state/SharingContext';
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
        <Stack.Screen name="setup" options={{ title: t.setup.title }} />
        <Stack.Screen name="edit/[kind]/[id]" options={{ title: t.edit.titleEdit }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="warning/[id]" options={{ title: t.warning.title }} />
        <Stack.Screen name="explain/[metric]" options={{ title: t.explain.title }} />
        <Stack.Screen name="investments" options={{ title: t.investments.title }} />
        <Stack.Screen name="account" options={{ title: t.account.title }} />
        <Stack.Screen name="groups/index" options={{ title: t.groupsPage.title }} />
        <Stack.Screen name="groups/[id]" options={{ title: t.groupsPage.title }} />
        <Stack.Screen name="scenario" options={{ title: t.scenario.title }} />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

/** While nobody is signed in on a build with accounts, the app is replaced by the sign-in screens. */
function AccountGate({ children }: { children: ReactNode }) {
  const account = useAccount();
  if (account.status === 'loading') return <View style={{ flex: 1 }} testID="account-loading" />;
  if (account.status === 'signedOut') return <AuthFlow />;
  return <>{children}</>;
}

/** Each account has its own saved plan, so switching accounts on a phone never shows another person's records. */
function Scoped({ children }: { children: ReactNode }) {
  const userId = useUserId();
  const account = useAccount();
  const fromSignIn = account.status === 'signedIn' && account.cameFromSignIn;
  return (
    <PrototypeProvider key={userId ?? 'local'} userId={userId}>
      <SharingProvider>
        <NotificationsProvider>
          {children}
          {fromSignIn ? <StartAtWelcome /> : null}
        </NotificationsProvider>
      </SharingProvider>
    </PrototypeProvider>
  );
}

/** After signing in, start from the welcome page rather than wherever the previous person left the app. */
function StartAtWelcome() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/'), 0);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AccountProvider>
        <AccountGate>
          <Scoped>
            <ThemedStack />
          </Scoped>
        </AccountGate>
      </AccountProvider>
    </ThemeProvider>
  );
}
