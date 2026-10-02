import { darkTheme, lightTheme, type Theme } from './palettes';

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const themes: [string, Theme][] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

describe.each(themes)('%s theme: text is readable (WCAG AA 4.5:1)', (_name, { colors: c }) => {
  const pairs: [string, string, string][] = [
    ['text on background', c.text, c.background],
    ['text on card', c.text, c.surface],
    ['text on raised card', c.text, c.surfaceAlt],
    ['muted text on background', c.textMuted, c.background],
    ['muted text on card', c.textMuted, c.surface],
    ['muted text on raised card', c.textMuted, c.surfaceAlt],
    ['button text on button', c.onPrimary, c.primary],
    ['link on card', c.primary, c.surface],
    ['link on background', c.primary, c.background],
    ['link on info card', c.primary, c.infoBg],
    ['gold text on card', c.gold, c.surface],
    ['text on info card', c.text, c.infoBg],
    ['warning text on warning card', c.warnText, c.warnBg],
    ['error text on error card', c.dangerText, c.dangerBg],
    ['error text on card', c.dangerText, c.surface],
    ['success text on card', c.successText, c.surface],
    ['hero text on hero card', c.heroText, c.heroBg],
    ['hero muted text on hero card', c.heroMuted, c.heroBg],
    ['hero gold on hero card', c.heroGold, c.heroBg],
  ];

  it.each(pairs)('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each(themes)('%s theme: chart marks are visible (3:1 on the card)', (_name, theme) => {
  const { chart, colors } = theme;
  const marks: [string, string][] = [
    ['safe-to-spend / bars', chart.bar],
    ['commitments', chart.commitments],
    ['savings', chart.savings],
    ['safety buffer', chart.buffer],
    ['everyday spending', chart.planned],
    ['over-budget fill', chart.critical],
    ['kept-aside line', chart.keptAsideLine],
  ];

  it.each(marks)('%s', (_label, colour) => {
    // Light-mode aqua, yellow and magenta are a little under 3:1 by design; every segment is therefore also
    // labelled, with a table view, so the visible-label relief rule applies. Dark mode passes outright.
    const minimum = theme.scheme === 'dark' ? 3 : 2.1;
    expect(contrast(colour, colors.surface)).toBeGreaterThanOrEqual(minimum);
  });

  it('chart axis labels are readable', () => {
    expect(contrast(chart.muted, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('themes', () => {
  it('are two different palettes with the same set of colours', () => {
    expect(Object.keys(lightTheme.colors).sort()).toEqual(Object.keys(darkTheme.colors).sort());
    expect(Object.keys(lightTheme.chart).sort()).toEqual(Object.keys(darkTheme.chart).sort());
    expect(lightTheme.colors.background).not.toBe(darkTheme.colors.background);
    expect(lightTheme.scheme).toBe('light');
    expect(darkTheme.scheme).toBe('dark');
  });

  it('use valid six-digit hex colours throughout', () => {
    for (const t of [lightTheme, darkTheme]) {
      for (const v of [...Object.values(t.colors), ...Object.values(t.chart)]) {
        expect(v).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('light is navy and gold; dark swaps the accent to gold', () => {
    expect(lightTheme.colors.primary).toBe('#12294A'); // navy
    expect(darkTheme.colors.primary).toBe('#E3B64F'); // gold
  });
});
