import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';

import { makeStyles, useTheme } from '../theme/ThemeProvider';
import { fontSize, minTouchTarget, radius, spacing } from '../theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const useStyles = makeStyles(({ colors, scheme }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  heading: {
    fontSize: fontSize.heading,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 23 },
  muted: { color: colors.textMuted },
  strong: { fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    // Soft shadow in light mode; dark mode relies on the border instead.
    ...(scheme === 'light'
      ? {
          shadowColor: '#12294A',
          shadowOpacity: 0.07,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }
      : {}),
  },
  cardDefault: { backgroundColor: colors.surface, borderColor: colors.border },
  cardInfo: { backgroundColor: colors.infoBg, borderColor: colors.infoBg },
  cardWarn: { backgroundColor: colors.warnBg, borderColor: colors.warnBg },
  cardDanger: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg },
  hero: {
    backgroundColor: colors.heroBg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: scheme === 'dark' ? 1 : 0,
    borderColor: colors.border,
    shadowColor: '#12294A',
    shadowOpacity: scheme === 'light' ? 0.25 : 0,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: scheme === 'light' ? 6 : 0,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonText: { fontSize: fontSize.body, fontWeight: '700', letterSpacing: 0.2 },
  buttonTextPrimary: { color: colors.onPrimary },
  buttonTextSecondary: { color: colors.primary },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { flex: 1 },
}));

export function Screen({ children, testID }: { children: ReactNode; testID: string }) {
  const styles = useStyles();
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
  const styles = useStyles();
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
  const styles = useStyles();
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
  const styles = useStyles();
  const toneStyle = {
    default: styles.cardDefault,
    info: styles.cardInfo,
    warn: styles.cardWarn,
    danger: styles.cardDanger,
  }[tone];
  return (
    <View style={[styles.card, toneStyle]} testID={testID}>
      {children}
    </View>
  );
}

/** The large navy card that leads a dashboard. Text inside should use `HeroText`. */
export function HeroCard({ children, testID }: { children: ReactNode; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.hero} testID={testID}>
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
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  testID?: string;
  hint?: string;
  /** An optional icon shown before the label. */
  icon?: IconName;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
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
      {icon ? (
        <Ionicons name={icon} size={20} color={primary ? colors.onPrimary : colors.primary} />
      ) : null}
      <Text
        style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.body, styles.rowLabel]}>{label}</Text>
      <Text style={[styles.body, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

export { minTouchTarget };
