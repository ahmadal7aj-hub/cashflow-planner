import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { t } from '../../i18n/strings';
import { usePrototype } from '../../state/PrototypeContext';
import { useTheme } from '../../theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** A tab icon that is outlined when the tab is not selected and filled when it is. */
function icon(filled: IconName, outline: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={24} color={color as string} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { sharing } = usePrototype();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.tabs.dashboard,
          tabBarIcon: icon('home', 'home-outline'),
          tabBarButtonTestID: 'tab-dashboard',
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
        name="savings"
        options={{
          title: t.tabs.savings,
          tabBarIcon: icon('wallet', 'wallet-outline'),
          tabBarButtonTestID: 'tab-savings',
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: t.tabs.budget,
          tabBarIcon: icon('pie-chart', 'pie-chart-outline'),
          tabBarButtonTestID: 'tab-budget',
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
        name="shared"
        options={{
          title: t.tabs.shared,
          href: sharing.linked ? undefined : null,
          tabBarIcon: icon('people', 'people-outline'),
          tabBarButtonTestID: 'tab-shared',
        }}
      />
    </Tabs>
  );
}
