import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import Commitments from '../app/commitments';
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
