import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';

import { BalanceChart } from '../components/charts';
import { Button, Card, HeroCard } from '../components/ui';
import { buildBalanceTimeline } from '../domain/forecastCharts';
import { computeForecast } from '../domain/prototypeForecast';
import { SAMPLE_INPUT } from '../domain/sampleData';
import { darkTheme, lightTheme } from './palettes';
import { ThemeProvider, useTheme, useThemeMode, type ThemeMode } from './ThemeProvider';

/** The background colour of a rendered element. */
function bg(testID: string): unknown {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style).backgroundColor;
}

function Probe() {
  const { scheme, colors } = useTheme();
  const { mode } = useThemeMode();
  return <Text testID="probe">{`${scheme}|${mode}|${colors.background}`}</Text>;
}

/** Buttons that switch the mode, like the Appearance setting does. */
function Switcher() {
  const { setMode } = useThemeMode();
  return (
    <>
      {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
        <Button key={m} label={m} onPress={() => setMode(m)} testID={`set-${m}`} />
      ))}
    </>
  );
}

describe('ThemeProvider', () => {
  it('uses the light theme when there is no provider', async () => {
    await render(<Probe />);
    expect(screen.getByTestId('probe').props.children).toBe(
      `light|system|${lightTheme.colors.background}`,
    );
  });

  it('forced dark stays dark on a light phone', async () => {
    await render(
      <ThemeProvider initialMode="dark" system="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe').props.children).toBe(
      `dark|dark|${darkTheme.colors.background}`,
    );
  });

  it('forced light stays light on a dark phone', async () => {
    await render(
      <ThemeProvider initialMode="light" system="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe').props.children).toBe(
      `light|light|${lightTheme.colors.background}`,
    );
  });

  it('"match my phone" follows a dark phone', async () => {
    await render(
      <ThemeProvider system="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe').props.children).toBe(
      `dark|system|${darkTheme.colors.background}`,
    );
  });

  it('"match my phone" follows a light phone', async () => {
    await render(
      <ThemeProvider system="light">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe').props.children).toBe(
      `light|system|${lightTheme.colors.background}`,
    );
  });

  it('falls back to light when the phone does not say', async () => {
    await render(
      <ThemeProvider system={null}>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe').props.children).toBe(
      `light|system|${lightTheme.colors.background}`,
    );
  });

  it('switches live when the user changes the mode', async () => {
    await render(
      <ThemeProvider system="light">
        <Probe />
        <Switcher />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe').props.children).toContain('light|system');

    await fireEvent.press(screen.getByTestId('set-dark'));
    expect(screen.getByTestId('probe').props.children).toBe(
      `dark|dark|${darkTheme.colors.background}`,
    );

    await fireEvent.press(screen.getByTestId('set-light'));
    expect(screen.getByTestId('probe').props.children).toContain('light|light');

    await fireEvent.press(screen.getByTestId('set-system'));
    expect(screen.getByTestId('probe').props.children).toContain('light|system');
  });
});

describe('components follow the theme', () => {
  it('a card is white in light mode', async () => {
    await render(
      <ThemeProvider initialMode="light">
        <Card testID="card">
          <Text>x</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(bg('card')).toBe(lightTheme.colors.surface);
  });

  it('a card is a deep navy in dark mode', async () => {
    await render(
      <ThemeProvider initialMode="dark">
        <Card testID="card">
          <Text>x</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(bg('card')).toBe(darkTheme.colors.surface);
  });

  it('the hero card uses the hero colour of the current mode', async () => {
    await render(
      <ThemeProvider initialMode="dark">
        <HeroCard testID="hero">
          <View />
        </HeroCard>
      </ThemeProvider>,
    );
    expect(bg('hero')).toBe(darkTheme.colors.heroBg);
  });

  it('a primary button is navy in light mode', async () => {
    await render(
      <ThemeProvider initialMode="light">
        <Button label="Go" onPress={() => undefined} testID="btn" />
      </ThemeProvider>,
    );
    expect(bg('btn')).toBe(lightTheme.colors.primary);
  });

  it('a primary button is gold in dark mode', async () => {
    await render(
      <ThemeProvider initialMode="dark">
        <Button label="Go" onPress={() => undefined} testID="btn" />
      </ThemeProvider>,
    );
    expect(bg('btn')).toBe(darkTheme.colors.primary);
  });

  it('chart bars use the light chart colour in light mode', async () => {
    const timeline = buildBalanceTimeline(computeForecast(SAMPLE_INPUT));
    await render(
      <ThemeProvider initialMode="light">
        <BalanceChart timeline={timeline} />
      </ThemeProvider>,
    );
    expect(bg('balance-bar-0')).toBe(lightTheme.chart.bar);
  });

  it('chart bars use the validated dark chart colour in dark mode', async () => {
    const timeline = buildBalanceTimeline(computeForecast(SAMPLE_INPUT));
    await render(
      <ThemeProvider initialMode="dark">
        <BalanceChart timeline={timeline} />
      </ThemeProvider>,
    );
    expect(bg('balance-bar-0')).toBe(darkTheme.chart.bar);
  });

  it('the same component changes colour when the mode is switched at run time', async () => {
    await render(
      <ThemeProvider system="light">
        <Card testID="card">
          <Text>x</Text>
        </Card>
        <Switcher />
      </ThemeProvider>,
    );
    expect(bg('card')).toBe(lightTheme.colors.surface);
    await fireEvent.press(screen.getByTestId('set-dark'));
    expect(bg('card')).toBe(darkTheme.colors.surface);
  });
});
