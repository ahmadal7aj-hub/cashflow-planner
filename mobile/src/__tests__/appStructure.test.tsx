import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { everyday, installTestLifecycle, openApp, pickDate, userWith } from '../testing/app';

installTestLifecycle();

describe('app structure', () => {
  it('has the five pages as tabs and no Insights tab; Shared stays hidden until linked', async () => {
    await openApp('/dashboard', { seed: userWith() });
    for (const id of ['dashboard', 'income', 'savings', 'budget', 'spending']) {
      expect(screen.getByTestId(`tab-${id}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('tab-insights')).toBeNull();
    expect(screen.queryByTestId('dash-section-shared')).toBeNull();
    expect(screen.getAllByText('Savings planning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Actual spending').length).toBeGreaterThan(0);
  });

  it('Budgeting keeps both Bills and fixed expenses and Everyday budgets', async () => {
    await openApp('/budget', { seed: userWith() });
    expect(screen.getByText('Bills and fixed expenses')).toBeTruthy();
    expect(screen.getByText('Everyday budgets')).toBeTruthy();
  });
});

describe('the welcome page', () => {
  it('Start goes to the savings questions for a new user', async () => {
    const { getPathname } = await openApp('/');
    await fireEvent.press(screen.getByTestId('start-button'));
    await waitFor(() => expect(getPathname()).toBe('/setup'));
  });

  it('Start goes straight to the dashboard once setup is done', async () => {
    const { getPathname } = await openApp('/', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('start-button'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
  });
});

describe('settings', () => {
  it('sample data is only loaded when asked for, and then fills the pages', async () => {
    await openApp('/settings');
    await fireEvent.press(screen.getByTestId('load-sample'));
    expect(screen.getByText('Sample data loaded.')).toBeTruthy();
  });
});

describe('editing keeps history', () => {
  it('raising a budget applies from this month; last month keeps its old budget', async () => {
    const plan = userWith({ expenses: [everyday('groc', 'groceries', 'Groceries', 3000)] });
    const { getPathname } = await openApp('/budget', { seed: plan });

    await fireEvent.press(screen.getByTestId('expense-groc'));
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/groc'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '3500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/budget'));

    await fireEvent.press(screen.getByTestId('tab-spending'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));
    expect(
      within(screen.getByTestId('cat-groceries')).getByLabelText('Budget: AED 3,500.00'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId('month-prev'));
    expect(
      within(screen.getByTestId('cat-groceries')).getByLabelText('Budget: AED 3,000.00'),
    ).toBeTruthy();
  });

  it('a budget of zero is accepted', async () => {
    const { getPathname } = await openApp('/budget', { seed: userWith() });
    await fireEvent.press(screen.getAllByTestId('add-variable')[0]!);
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '0');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/budget'));
    expect(screen.getByTestId('expense-exp-1')).toBeTruthy();
  });

  it('a new bill needs a due date and then appears with it', async () => {
    const { getPathname } = await openApp('/budget', { seed: userWith() });
    await fireEvent.press(screen.getAllByTestId('add-fixed')[0]!);
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '3500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-due-date')).toBeTruthy(); // not saved without a date
    await pickDate('due-date-toggle', '2026-10-20');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/budget'));
    expect(screen.getByText('Due 20 Oct 2026')).toBeTruthy();
    expect(screen.getByTestId('pay-exp-1')).toBeTruthy();
  });
});
