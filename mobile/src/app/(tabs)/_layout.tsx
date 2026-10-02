import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { t } from '../../i18n/strings';
import { colors } from '../../theme/tokens';

/** Simple text glyphs keep the app free of an icon dependency; labels carry the meaning. */
function glyph(symbol: string) {
  return function TabGlyph({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 18 }}>{symbol}</Text>;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.tabs.overview,
          tabBarIcon: glyph('⌂'),
          tabBarButtonTestID: 'tab-overview',
        }}
      />
      <Tabs.Screen
        name="spending"
        options={{
          title: t.tabs.spending,
          tabBarIcon: glyph('↘'),
          tabBarButtonTestID: 'tab-spending',
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: t.tabs.savings,
          tabBarIcon: glyph('\u25C8'),
          tabBarButtonTestID: 'tab-savings',
        }}
      />
    </Tabs>
  );
}
