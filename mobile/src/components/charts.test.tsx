import { fireEvent, render, screen } from '@testing-library/react-native';

import { buildBalanceTimeline, buildBreakdown } from '../domain/forecastCharts';
import { aedToFils } from '../domain/money';
import { computeForecast } from '../domain/prototypeForecast';
import { SAMPLE_INPUT } from '../domain/sampleData';
import { BalanceChart, BreakdownBar } from './charts';

const sample = computeForecast(SAMPLE_INPUT);

describe('BalanceChart', () => {
  it('renders one bar per day and an accessible text summary', async () => {
    await render(<BalanceChart timeline={buildBalanceTimeline(sample)} />);

    expect(screen.getAllByTestId(/^balance-bar-/)).toHaveLength(12);
    const plot = screen.getByTestId('balance-chart-plot');
    expect(plot.props.accessibilityLabel).toBe(
      'Projected balance falls from AED 12,000.00 today to AED 4,920.00 on day 12. AED 3,150.00 is kept aside for savings, buffer and everyday spending.',
    );
  });

  it('labels the kept-aside line directly', async () => {
    await render(<BalanceChart timeline={buildBalanceTimeline(sample)} />);
    expect(screen.getByText('Kept aside AED 3,150.00')).toBeTruthy();
  });

  it('offers a table view with every day, and can hide it again', async () => {
    await render(<BalanceChart timeline={buildBalanceTimeline(sample)} />);
    expect(screen.queryByTestId('balance-table')).toBeNull();

    await fireEvent.press(screen.getByTestId('balance-table-toggle'));
    expect(screen.getByTestId('balance-table')).toBeTruthy();
    expect(screen.getByLabelText('Day 3: AED 12,000.00')).toBeTruthy(); // before rent
    expect(screen.getByLabelText('Day 4: AED 8,500.00')).toBeTruthy(); // after rent
    expect(screen.getByLabelText('Day 6: AED 8,050.00')).toBeTruthy(); // after DEWA

    await fireEvent.press(screen.getByTestId('balance-table-toggle'));
    expect(screen.queryByTestId('balance-table')).toBeNull();
  });

  it('draws a zero-height bar, not a negative one, when the balance is below zero', async () => {
    const f = computeForecast({ ...SAMPLE_INPUT, availableCash: aedToFils(1000) });
    await render(<BalanceChart timeline={buildBalanceTimeline(f)} />);
    const last = screen.getByTestId('balance-bar-11');
    const style = [last.props.style].flat().find((s) => s && 'height' in s);
    expect(style.height).toBe(0);
  });
});

describe('BreakdownBar', () => {
  it('lists every part with its value and share, so color is never the only cue', async () => {
    await render(<BreakdownBar breakdown={buildBreakdown(sample)} />);

    for (const label of [
      'Safe to spend',
      'Commitments',
      'Savings',
      'Safety buffer',
      'Everyday spending',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByLabelText('Commitments: AED 7,080.00, 59%')).toBeTruthy();
    expect(screen.getByLabelText('Safe to spend: AED 1,770.00, 15%')).toBeTruthy();
    expect(screen.queryByTestId('breakdown-shortfall')).toBeNull();
  });

  it('shows a labelled shortfall instead of a safe-to-spend segment', async () => {
    const f = computeForecast({ ...SAMPLE_INPUT, plannedExpenses: aedToFils(5000) });
    await render(<BreakdownBar breakdown={buildBreakdown(f)} />);

    expect(screen.getByTestId('breakdown-shortfall')).toBeTruthy();
    expect(screen.getByText(/Shortfall: this plan needs AED 1,580.00 more/)).toBeTruthy();
    expect(screen.queryByText('Safe to spend')).toBeNull();
  });
});
