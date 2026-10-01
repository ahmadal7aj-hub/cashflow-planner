/** Centralized design tokens. No hard-coded colors/spacing in screens. */
export const colors = {
  background: '#f7f8f6',
  surface: '#ffffff',
  text: '#16201c',
  textMuted: '#4b5a54',
  border: '#d5ddd9',
  primary: '#0f5c4d',
  primaryText: '#ffffff',
  infoBg: '#e6f0ed',
  warnBg: '#fef3c7',
  warnText: '#78350f',
  dangerBg: '#fee2e2',
  dangerText: '#7f1d1d',
  envBanner: '#92400e',
} as const;

/**
 * Chart colors. Categorical slots follow the validated fixed order (blue, orange, aqua, yellow,
 * magenta); validated on the white card surface (adjacent CVD and normal-vision gates pass).
 * Three slots are under 3:1 contrast, so every segment also has a visible label and a table view.
 */
export const chartColors = {
  safe: '#2a78d6',
  commitments: '#eb6834',
  savings: '#1baf7a',
  buffer: '#eda100',
  planned: '#e87ba4',
  bar: '#2a78d6',
  keptAsideLine: '#52514e',
  baseline: '#c3c2b7',
  gridline: '#e1e0d9',
  muted: '#6b6a66',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { md: 12, lg: 16 } as const;
export const fontSize = { caption: 13, body: 16, title: 22, hero: 36 } as const;
/** Minimum touch target (WCAG / platform guidance). */
export const minTouchTarget = 48;
