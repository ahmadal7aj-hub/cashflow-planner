import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { appEnvironment, environmentLabel, isProduction } from './src/config/environment';

// Stable placeholder screen (P0-01 / P0-05). The Maestro smoke flow targets the testIDs below.
export default function App() {
  return (
    <View style={styles.container} testID="home-screen">
      {!isProduction(appEnvironment) && (
        <View style={styles.banner} testID="environment-banner">
          <Text style={styles.bannerText}>{environmentLabel(appEnvironment)}</Text>
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        UAE Cash-Flow Planner
      </Text>
      <Text style={styles.subtitle}>Foundation build</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingTop: 40,
    backgroundColor: '#b45309',
    alignItems: 'center',
  },
  bannerText: { color: '#fff', fontWeight: '600', fontSize: 12, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '600' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#555' },
});
