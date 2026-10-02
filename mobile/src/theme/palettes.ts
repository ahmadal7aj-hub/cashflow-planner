/**
 * Navy and gold palettes for light and dark mode. Every text and background pair is checked in
 * `theme.test.ts` against WCAG contrast (4.5:1 for text), and the chart colours were run through the
 * dataviz palette validator on the card colour of each mode.
 */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  /** Main accent: navy in light mode, gold in dark mode. Used for buttons and links. */
  primary: string;
  /** Text and icons placed on `primary`. */
  onPrimary: string;
  /** Gold, readable as text on `surface`. */
  gold: string;
  infoBg: string;
  warnBg: string;
  warnText: string;
  dangerBg: string;
  dangerText: string;
  successText: string;
  /** The big navy card that leads each dashboard. */
  heroBg: string;
  heroText: string;
  heroMuted: string;
  heroGold: string;
  /** Strip shown on non-production builds. */
  envBanner: string;
}

/** Chart colours. The five categorical slots follow the validated fixed order. */
export interface ChartColors {
  safe: string;
  commitments: string;
  savings: string;
  buffer: string;
  planned: string;
  bar: string;
  /** Earlier bars in a trend, so the latest bar stands out. */
  barMuted: string;
  keptAsideLine: string;
  baseline: string;
  gridline: string;
  muted: string;
  critical: string;
}

export type Scheme = 'light' | 'dark';

export interface Theme {
  scheme: Scheme;
  colors: ThemeColors;
  chart: ChartColors;
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: {
    background: '#FAF7F0',
    surface: '#FFFFFF',
    surfaceAlt: '#F3EEE2',
    text: '#0E1B2C',
    textMuted: '#4B5667',
    border: '#DCD3BF',
    primary: '#12294A',
    onPrimary: '#FFFFFF',
    gold: '#8A6410',
    infoBg: '#E9EFF8',
    warnBg: '#FFF1CC',
    warnText: '#5C3F00',
    dangerBg: '#FCE6E3',
    dangerText: '#8A1C1C',
    successText: '#0F6B3F',
    heroBg: '#12294A',
    heroText: '#FFFFFF',
    heroMuted: '#C8D3E6',
    heroGold: '#E8C063',
    envBanner: '#92400E',
  },
  chart: {
    safe: '#2a78d6',
    commitments: '#eb6834',
    savings: '#1baf7a',
    buffer: '#eda100',
    planned: '#e87ba4',
    bar: '#2a78d6',
    barMuted: '#9ec5f4',
    keptAsideLine: '#52514e',
    baseline: '#c3c2b7',
    gridline: '#e1e0d9',
    muted: '#6b6a66',
    critical: '#d03b3b',
  },
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: {
    background: '#0A1220',
    surface: '#121C2F',
    surfaceAlt: '#1A2740',
    text: '#F1F4F9',
    textMuted: '#A7B3C7',
    border: '#2A3855',
    primary: '#E3B64F',
    onPrimary: '#0A1220',
    gold: '#E3B64F',
    infoBg: '#17263F',
    warnBg: '#3A2D0E',
    warnText: '#F6DB8E',
    dangerBg: '#3A1517',
    dangerText: '#FFB3AC',
    successText: '#5FD39A',
    heroBg: '#1A2F55',
    heroText: '#FFFFFF',
    heroMuted: '#C3CFE3',
    heroGold: '#E8C063',
    envBanner: '#B45309',
  },
  chart: {
    safe: '#3987e5',
    commitments: '#d95926',
    savings: '#199e70',
    buffer: '#c98500',
    planned: '#d55181',
    bar: '#3987e5',
    barMuted: '#5578ab',
    keptAsideLine: '#c3c2b7',
    baseline: '#3a4660',
    gridline: '#26334d',
    muted: '#98a3b8',
    critical: '#e66767',
  },
};
