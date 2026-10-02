/** Layout tokens shared by both colour modes. Colours live in `palettes.ts` and come from `useTheme()`. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const fontSize = { caption: 13, body: 16, heading: 19, title: 24, hero: 42 } as const;
/** Minimum touch target (WCAG / platform guidance). */
export const minTouchTarget = 48;
