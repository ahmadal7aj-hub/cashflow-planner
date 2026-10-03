import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { dashboardWorld, installTestLifecycle, openApp } from '../testing/app';

installTestLifecycle();

const shown = () => screen.getByTestId('range-shown').props.children as string;

describe('dashboard date ranges', () => {
  it('defaults to the current calendar month and shows the dates', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    expect(shown()).toBe('Showing 1 Oct 2026 to 31 Oct 2026');
    expect(screen.getByLabelText('This month')).toBeTruthy();
  });

  it('every preset shows its exact dates', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() }); // today is Thursday 15 Oct 2026
    const expected: Record<string, string> = {
      'last-week': 'Showing 5 Oct 2026 to 11 Oct 2026',
      'last-month': 'Showing 1 Sep 2026 to 30 Sep 2026',
      'last-quarter': 'Showing 1 Jul 2026 to 30 Sep 2026',
      'last-year': 'Showing 1 Jan 2025 to 31 Dec 2025',
      'current-month': 'Showing 1 Oct 2026 to 31 Oct 2026',
    };
    for (const [id, text] of Object.entries(expected)) {
      await fireEvent.press(screen.getByTestId(`range-${id}`));
      expect(shown()).toBe(text);
    }
  });

  async function setRange(from: string, to: string) {
    await fireEvent.press(screen.getByTestId('range-custom'));
    await fireEvent.changeText(screen.getByTestId('input-range-from'), from);
    await fireEvent.changeText(screen.getByTestId('input-range-to'), to);
  }

  it('a custom range of ten days works, and the dates are shown', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await setRange('2026-10-05', '2026-10-14');
    expect(shown()).toBe('Showing 5 Oct 2026 to 14 Oct 2026');
    expect(screen.queryByTestId('range-error')).toBeNull();
  });

  it('a custom range of two years works', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await setRange('2024-10-15', '2026-10-14');
    expect(shown()).toBe('Showing 15 Oct 2024 to 14 Oct 2026');
    expect(screen.getByLabelText('Received: AED 20,000.00')).toBeTruthy(); // 25 Aug and 25 Sep 2026
  });

  it('a custom range of January 2026 works, with no budget or spending before the plan began', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await setRange('2026-01-01', '2026-01-31');
    expect(shown()).toBe('Showing 1 Jan 2026 to 31 Jan 2026');
    expect(
      within(screen.getByTestId('spending-summary')).getByLabelText(
        'Budget for these dates: AED 0.00',
      ),
    ).toBeTruthy();
  });

  it('a single day works', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await setRange('2026-10-05', '2026-10-05');
    expect(shown()).toBe('Showing 5 Oct 2026 to 5 Oct 2026');
    expect(
      within(screen.getByTestId('spending-summary')).getByLabelText('Actual spending: AED 500.00'),
    ).toBeTruthy();
  });

  it('a custom range whose end is before its start explains the problem', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await setRange('2026-10-20', '2026-10-10');
    expect(screen.getByTestId('range-error').props.children).toBe(
      'The end date cannot be before the start date.',
    );
  });

  it('an impossible date such as 30 February is rejected', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await setRange('2026-02-30', '2026-03-10');
    expect(screen.getByTestId('error-range-from')).toBeTruthy();
  });

  it('this month shows spending against budget and income still to come', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    const spending = within(screen.getByTestId('spending-summary'));
    expect(spending.getByLabelText('Budget for these dates: AED 3,000.00')).toBeTruthy();
    expect(spending.getByLabelText('Actual spending: AED 500.00')).toBeTruthy();
    expect(spending.getByLabelText('Remaining budget: AED 2,500.00')).toBeTruthy();
    const income = within(screen.getByTestId('income-summary'));
    expect(income.getByLabelText('Received: AED 0.00')).toBeTruthy();
    expect(income.getByLabelText('Still expected: AED 10,000.00')).toBeTruthy();
  });

  it('last month shows that month, and a partial month explains the budget share', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await fireEvent.press(screen.getByTestId('range-last-month'));
    const spending = within(screen.getByTestId('spending-summary'));
    expect(spending.getByLabelText('Actual spending: AED 800.00')).toBeTruthy();
    expect(spending.getByLabelText('Remaining budget: AED 2,200.00')).toBeTruthy();
    expect(spending.queryByText(/shared out by days/)).toBeNull();

    await fireEvent.press(screen.getByTestId('range-last-week'));
    expect(
      within(screen.getByTestId('spending-summary')).getByText(/shared out by days/),
    ).toBeTruthy();
  });

  it('filtering never changes the records', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    for (const id of ['last-week', 'last-quarter', 'last-year', 'custom', 'current-month']) {
      await fireEvent.press(screen.getByTestId(`range-${id}`));
    }
    await fireEvent.press(screen.getByTestId('tab-income'));
    await waitFor(() => expect(screen.getByTestId('income-salary')).toBeTruthy());
    expect(screen.getByText('AED 10,000.00')).toBeTruthy();
  });
});

describe('period savings versus total savings', () => {
  const savingsValue = () => screen.getByTestId('savings-value').props.children as string;

  it('this month: period savings is what was added; total savings is cumulative', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    expect(screen.getByLabelText('This month’s savings')).toBeTruthy();
    expect(screen.getByLabelText('Total savings')).toBeTruthy();
    expect(savingsValue()).toBe('+AED 2,000.00');

    await fireEvent.press(screen.getByTestId('savings-view-total'));
    expect(savingsValue()).toBe('AED 14,000.00'); // 10,000 + 1,000 + 1,000 + 2,000
    expect(screen.getByTestId('savings-projected')).toBeTruthy(); // the month is unfinished: projected
  });

  it('last month: the balance at the end of that month, not today', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await fireEvent.press(screen.getByTestId('range-last-month'));
    expect(screen.getByLabelText('Period savings')).toBeTruthy(); // not "This month"
    expect(savingsValue()).toBe('+AED 1,000.00');

    await fireEvent.press(screen.getByTestId('savings-view-total'));
    expect(savingsValue()).toBe('AED 12,000.00');
    expect(screen.queryByTestId('savings-projected')).toBeNull();
    expect(screen.getByText('Cumulative balance at the end of 30 Sep 2026')).toBeTruthy();
  });

  it('a period before the savings balance starts says so instead of inventing a number', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await fireEvent.press(screen.getByTestId('range-last-year'));
    await fireEvent.press(screen.getByTestId('savings-view-total'));
    expect(screen.getByTestId('savings-unknown')).toBeTruthy();
    expect(screen.queryByTestId('savings-value')).toBeNull();
  });
});
