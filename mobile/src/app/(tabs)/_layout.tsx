import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import type { IconName } from '../../components/ui';
import { t } from '../../i18n/strings';
import { useTheme } from '../../theme/ThemeProvider';

/** A tab icon that is outlined when the tab is not selected and filled when it is. */
function icon(filled: IconName, outline: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={24} color={color as string} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 4,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.tabs.overview,
          tabBarIcon: icon('home', 'home-outline'),
          tabBarButtonTestID: 'tab-overview',
        }}
      />
      <Tabs.Screen
        name="spending"
        options={{
          title: t.tabs.spending,
          tabBarIcon: icon('card', 'card-outline'),
          tabBarButtonTestID: 'tab-spending',
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: t.tabs.savings,
          tabBarIcon: icon('wallet', 'wallet-outline'),
          tabBarButtonTestID: 'tab-savings',
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: t.tabs.income,
          tabBarIcon: icon('trending-up', 'trending-up-outline'),
          tabBarButtonTestID: 'tab-income',
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t.tabs.insights,
          tabBarIcon: icon('bulb', 'bulb-outline'),
          tabBarButtonTestID: 'tab-insights',
        }}
      />
    </Tabs>
  );
}
