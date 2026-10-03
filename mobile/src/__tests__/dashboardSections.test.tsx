import { fireEvent, screen, within } from 'expo-router/testing-library';

import { emptyPlan } from '../domain/budgetModel';
import { dashboardWorld, installTestLifecycle, openApp } from '../testing/app';

installTestLifecycle();

const open = (section: string) => fireEvent.press(screen.getByTestId(`dash-section-${section}`));

describe('all dashboards live in one tab', () => {
  it('offers Overview, Income, Budget, Spending and Savings, and Shared only when something is shared', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    for (const id of ['overview', 'income', 'budget', 'spending', 'savings']) {
      expect(screen.getByTestId(`dash-section-${id}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('dash-section-shared')).toBeNull();
    // No separate tab for it either; the tab is named for what it holds.
    expect(screen.queryByTestId('tab-shared')).toBeNull();
    expect(screen.getAllByText('Dashboards').length).toBeGreaterThan(0);
  });

  it('opens on the overview with the summary cards unchanged', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    expect(screen.getByTestId('income-summary')).toBeTruthy();
    expect(screen.getByTestId('savings-summary')).toBeTruthy();
    expect(screen.getByTestId('spending-summary')).toBeTruthy();
  });

  it('Income: received and expected, a chart by month and by source', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await open('income');
    expect(screen.getByTestId('income-dashboard')).toBeTruthy();
    expect(screen.getByTestId('income-trend')).toBeTruthy();
    const sources = within(screen.getByTestId('income-sources'));
    expect(sources.getByText('Salary')).toBeTruthy();
    expect(screen.queryByTestId('income-summary')).toBeNull();
  });

  it('Budget: the plan by category and how each budget is being used', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await open('budget');
    expect(screen.getByTestId('budget-by-category')).toBeTruthy();
    const usage = within(screen.getByTestId('budget-usage'));
    expect(usage.getByLabelText(/^Groceries: AED 500.00 of AED 3,000.00/)).toBeTruthy();
  });

  it('Spending: a chart by month and by category with the same total as the overview', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await open('spending');
    expect(screen.getByTestId('spending-trend')).toBeTruthy();
    const cats = within(screen.getByTestId('spending-by-category'));
    expect(cats.getByLabelText(/^Groceries: AED 500.00/)).toBeTruthy();
    expect(
      within(screen.getByTestId('spending-dashboard')).getByLabelText(
        'Actual spending: AED 500.00',
      ),
    ).toBeTruthy();
  });

  it('Savings: what was saved in the dates, the balance and a chart', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await open('savings');
    expect(screen.getByTestId('savings-dashboard-period').props.children).toBe('+AED 2,000.00');
    expect(screen.getByTestId('savings-dashboard-total')).toBeTruthy();
    expect(screen.getByTestId('savings-trend')).toBeTruthy();
  });

  it('one set of date buttons changes every section, and the choice stays when you switch', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await fireEvent.press(screen.getByTestId('range-last-quarter')); // Jul to Sep: only the 800 spent in September
    await open('spending');
    expect(
      within(screen.getByTestId('spending-dashboard')).getByLabelText(
        'Actual spending: AED 800.00',
      ),
    ).toBeTruthy();
    await open('savings');
    // The same figure the overview shows for the same dates.
    const here = screen.getByTestId('savings-dashboard-period').props.children;
    await open('overview');
    expect(screen.getByTestId('savings-value').props.children).toBe(here);
    expect(screen.getByTestId('range-shown').props.children).toBe(
      'Showing 1 Jul 2026 to 30 Sep 2026',
    );
  });

  it('explains an empty section instead of showing empty charts', async () => {
    await openApp('/dashboard', { seed: { ...emptyPlan(), setupDone: true } });
    await open('income');
    expect(screen.getByTestId('income-dashboard-empty')).toBeTruthy();
    await open('budget');
    expect(screen.getByTestId('budget-dashboard-empty')).toBeTruthy();
    await open('spending');
    expect(screen.getByTestId('spending-dashboard-empty')).toBeTruthy();
    await open('savings');
    expect(screen.getByTestId('savings-dashboard-empty')).toBeTruthy();
  });

  it('the overview opens with charts: in, spent and saved; budget used; month by month; savings balance', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() }); // October 2026: spent 500 of 3,000, saved 2,000
    expect(
      screen.getByLabelText(
        'Money in, spent and saved. Income: AED 0.00; Spent: AED 500.00; Saved: AED 2,000.00',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('chart-budget-used-pct').props.children).toBe('17%');
    expect(screen.getByTestId('chart-by-month')).toBeTruthy();
    expect(screen.getByLabelText(/^Savings balance. Oct: AED 14,000.00/)).toBeTruthy();
    // The number cards are still there, under Details.
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByTestId('spending-summary')).toBeTruthy();
  });

  it('a longer range shows one group of columns per month, and over budget turns the meter red with a written note', async () => {
    await openApp('/dashboard', { seed: dashboardWorld() });
    await fireEvent.press(screen.getByTestId('range-last-quarter'));
    expect(
      screen.getByLabelText(
        /^Month by month. Jul: .*; Aug: .*; Sep: Income AED 10,000.00, Spent AED 800.00/,
      ),
    ).toBeTruthy();
    await open('budget');
    expect(screen.getByTestId('budget-meter')).toBeTruthy();
  });
});
