import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { colors, fontSize, minTouchTarget, radius, spacing } from '../theme/tokens';

export function Screen({ children, testID }: { children: ReactNode; testID: string }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      testID={testID}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
  testID,
  accessibilityLiveRegion,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: TextStyle;
  testID?: string;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}) {
  return (
    <Text
      style={[styles.body, muted && styles.muted, style]}
      testID={testID}
      accessibilityLiveRegion={accessibilityLiveRegion}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  tone = 'default',
  testID,
}: {
  children: ReactNode;
  tone?: 'default' | 'info' | 'warn' | 'danger';
  testID?: string;
}) {
  return (
    <View style={[styles.card, toneStyles[tone]]} testID={testID}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  testID,
  hint,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  testID?: string;
  hint?: string;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.body, styles.rowLabel]}>{label}</Text>
      <Text style={[styles.body, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  info: { backgroundColor: colors.infoBg, borderColor: colors.infoBg },
  warn: { backgroundColor: colors.warnBg, borderColor: colors.warnBg },
  danger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  heading: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  body: { fontSize: fontSize.body, color: colors.text },
  muted: { color: colors.textMuted },
  strong: { fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  button: {
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  buttonText: { fontSize: fontSize.body, fontWeight: '600' },
  buttonTextPrimary: { color: colors.primaryText },
  buttonTextSecondary: { color: colors.primary },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { flex: 1 },
});
