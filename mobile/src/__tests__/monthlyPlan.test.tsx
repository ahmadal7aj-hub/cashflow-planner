import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import Commitments from '../app/commitments';
import EditItem from '../app/edit/[kind]/[id]';
import MonthlyPlan from '../app/monthly-plan';
import TabsLayout from '../app/(tabs)/_layout';
import Dashboard from '../app/(tabs)/dashboard';
import Income from '../app/(tabs)/income';
import Insights from '../app/(tabs)/insights';
import Savings from '../app/(tabs)/savings';
import Spending from '../app/(tabs)/spending';

const routes = {
  _layout: RootLayout,
  commitments: Commitments,
  'edit/[kind]/[id]': EditItem,
  'monthly-plan': MonthlyPlan,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/dashboard': Dashboard,
  '(tabs)/income': Income,
  '(tabs)/insights': Insights,
  '(tabs)/savings': Savings,
  '(tabs)/spending': Spending,
};

async function open(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

describe('monthly plan: income, then saving, then what is left', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-03T08:00:00') });
  });
  afterEach(() => jest.useRealTimers());

  it('is reachable from the Savings tab', async () => {
    const { getPathname } = await open('/savings');
    await fireEvent.press(screen.getByTestId('open-monthly-plan'));
    await waitFor(() => expect(getPathname()).toBe('/monthly-plan'));
  });

  it('is reachable from the income and expenses screen', async () => {
    const { getPathname } = await open('/commitments');
    await fireEvent.press(screen.getByTestId('commitments-plan'));
    await waitFor(() => expect(getPathname()).toBe('/monthly-plan'));
  });

  it('shows income, then updates what is left as the saving amount is typed', async () => {
    await open('/monthly-plan');
    expect(screen.getByText('AED 17,830.00')).toBeTruthy();
    expect(screen.getByText('AED 16,630.00')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-monthly-savings'), '2000');
    expect(screen.getByText('AED 14,630.00')).toBeTruthy();
  });

  it('rejects an invalid amount and does not save it', async () => {
    await open('/monthly-plan');
    await fireEvent.changeText(screen.getByTestId('input-monthly-savings'), 'abc');
    expect(screen.getByTestId('error-monthly-savings')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('monthly-plan-save'));
    expect(screen.queryByTestId('monthly-plan-saved')).toBeNull();
  });

  it('saves the amount, which lowers safe to spend on the dashboard', async () => {
    const { getPathname } = await open('/monthly-plan');
    await fireEvent.changeText(screen.getByTestId('input-monthly-savings'), '500');
    await fireEvent.press(screen.getByTestId('monthly-plan-save'));
    expect(screen.getByTestId('monthly-plan-saved')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('plan-edit-income'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    // 1,770.00 - 500.00 set aside.
    expect(screen.getAllByText('AED 1,270.00').length).toBeGreaterThan(0);
  });
});

describe('income can be zero or removed, and spending follows the balance', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-03T08:00:00') });
  });
  afterEach(() => jest.useRealTimers());

  it('accepts zero for an income item and says it is not received this month', async () => {
    const { getPathname } = await open('/commitments');
    await fireEvent.press(screen.getByTestId('income-side'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/side'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '0');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    expect(screen.getByText('Not receiving this month')).toBeTruthy();
  });

  it('still rejects junk for an income amount', async () => {
    const { getPathname } = await open('/commitments');
    await fireEvent.press(screen.getByTestId('income-side'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/side'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), 'abc');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-amount')).toBeTruthy();
  });

  it('removes an item straight from the list, including the salary and the car loan', async () => {
    await open('/commitments');
    expect(screen.getByTestId('income-salary')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('remove-salary'));
    expect(screen.queryByTestId('income-salary')).toBeNull();

    expect(screen.getByTestId('expense-car')).toBeTruthy(); // the sample car loan
    await fireEvent.press(screen.getByTestId('remove-car'));
    expect(screen.queryByTestId('expense-car')).toBeNull();
  });

  it('accepts zero for an everyday budget', async () => {
    const { getPathname } = await open('/commitments');
    await fireEvent.press(screen.getByTestId('add-variable'));
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '0');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
  });

  it('deletes an income item', async () => {
    const { getPathname } = await open('/commitments');
    await fireEvent.press(screen.getByTestId('income-side'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/side'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    expect(screen.queryByTestId('income-side')).toBeNull();
  });

  it('clears the sample data so the user can start fresh', async () => {
    const { getPathname } = await open('/commitments');
    await fireEvent.press(screen.getByTestId('clear-sample'));
    expect(screen.queryByTestId('income-salary')).toBeNull();
    // Only the core essentials stay, at zero; the car loan is gone.
    expect(screen.getByTestId('expense-starter-rent')).toBeTruthy();
    expect(screen.queryByTestId('expense-car')).toBeNull();
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
  });

  it('shows the spending budget against what is left after saving', async () => {
    await open('/spending');
    expect(screen.getByTestId('spending-budget-card')).toBeTruthy();
    expect(screen.getByText('AED 16,630.00')).toBeTruthy();
  });

  it('tells you how much stays unbudgeted while you type a new budget', async () => {
    const { getPathname } = await open('/edit/variable/new');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '1000');
    expect(screen.getByTestId('unbudgeted-note')).toBeTruthy();
    expect(getPathname()).toBe('/edit/variable/new');
  });
});
