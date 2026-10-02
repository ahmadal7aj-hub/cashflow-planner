import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from './palettes';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  /** What the user chose: follow the phone, or force light or dark. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Without a provider (for example a component rendered on its own in a test) the light theme is used.
const Ctx = createContext<ThemeState>({
  theme: lightTheme,
  mode: 'system',
  setMode: () => undefined,
});

export function ThemeProvider({
  children,
  initialMode = 'system',
  system: systemOverride,
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
  /** The phone's appearance. Defaults to the real setting; pass a value for previews and tests. */
  system?: 'light' | 'dark' | null;
}) {
  const deviceScheme = useColorScheme();
  const system = systemOverride === undefined ? deviceScheme : systemOverride;
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const value = useMemo<ThemeState>(() => {
    const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
    return { theme: dark ? darkTheme : lightTheme, mode, setMode };
  }, [mode, system]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Theme {
  return useContext(Ctx).theme;
}

export function useThemeMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const { mode, setMode } = useContext(Ctx);
  return { mode, setMode };
}

/**
 * Create styles that depend on the current theme:
 *   const useStyles = makeStyles(({ colors }) => ({ box: { backgroundColor: colors.surface } }));
 *   // inside a component: const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
