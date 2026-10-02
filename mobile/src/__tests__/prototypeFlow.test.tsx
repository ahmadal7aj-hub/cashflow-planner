import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { clearRecordedEvents, getRecordedEvents } from '../analytics/events';
import Commitments from '../app/commitments';
import TabsLayout from '../app/(tabs)/_layout';
import Dashboard from '../app/(tabs)/dashboard';
import Income from '../app/(tabs)/income';
import Insights from '../app/(tabs)/insights';
import Savings from '../app/(tabs)/savings';
import Spending from '../app/(tabs)/spending';
import EditItem from '../app/edit/[kind]/[id]';
import Explain from '../app/explain/[metric]';
import RootLayout from '../app/_layout';
import Index from '../app/index';
import Onboarding from '../app/onboarding';
import Scenario from '../app/scenario';
import Settings from '../app/settings';
import Warning from '../app/warning/[id]';

const routes = {
  _layout: RootLayout,
  index: Index,
  onboarding: Onboarding,
  commitments: Commitments,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/dashboard': Dashboard,
  '(tabs)/income': Income,
  '(tabs)/insights': Insights,
  '(tabs)/savings': Savings,
  '(tabs)/spending': Spending,
  scenario: Scenario,
  settings: Settings,
  'warning/[id]': Warning,
  'explain/[metric]': Explain,
  'edit/[kind]/[id]': EditItem,
};

beforeEach(clearRecordedEvents);

/** RNTL v14 renders asynchronously and expo-router attaches getPathname to the returned promise. */
async function openApp(initialUrl?: string) {
  const rendered = renderRouter(routes, initialUrl ? { initialUrl } : {});
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

describe('prototype journey (P1-01)', () => {
  it('shows a stable home screen and the non-production banner (P0-02)', async () => {
    await openApp();

    expect(screen.getByTestId('home-screen')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'UAE Cash-Flow Planner' })).toBeTruthy();
    // EXPO_PUBLIC_APP_ENV is unset under Jest, which resolves to development.
    expect(screen.getByText('DEVELOPMENT build')).toBeTruthy();
  });

  it('walks welcome -> onboarding -> commitments -> dashboard with correct numbers', async () => {
    const { getPathname } = await openApp();

    await fireEvent.press(screen.getByTestId('start-button'));
    await waitFor(() => expect(getPathname()).toBe('/onboarding'));

    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));

    expect(screen.getByText('AED 1,770.00')).toBeTruthy(); // safe to spend
    expect(screen.getByText('AED 147.50 per day')).toBeTruthy();
    expect(screen.getByText('AED 2,070.00')).toBeTruthy(); // forecast balance
  });

  it('rejects invalid onboarding input with an accessible error and does not advance', async () => {
    const { getPathname } = await openApp('/onboarding');

    await fireEvent.changeText(screen.getByTestId('input-balance'), '-50');
    await fireEvent.press(screen.getByTestId('onboarding-continue'));

    expect(screen.getByTestId('error-balance')).toBeTruthy();
    expect(getPathname()).toBe('/onboarding');
  });

  it('recomputes the dashboard from edited numbers', async () => {
    const { getPathname } = await openApp('/onboarding');

    await fireEvent.changeText(screen.getByTestId('input-balance'), '14000');
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));

    expect(screen.getByText('AED 3,770.00')).toBeTruthy(); // 1,770 + 2,000 more cash
  });

  it('opens a warning and explains why (P3-04 preview)', async () => {
    const { getPathname } = await openApp('/dashboard');

    await fireEvent.press(screen.getByTestId('warning-due-rent-d4'));
    await waitFor(() => expect(getPathname()).toBe('/warning/due-rent-d4'));

    expect(screen.getByText('Commitment due soon')).toBeTruthy();
    expect(screen.getByText('AED 3,500.00')).toBeTruthy();
    expect(getRecordedEvents()).toContainEqual({
      name: 'warning_opened',
      props: { warning_type: 'commitment-due-soon' },
    });
  });

  it('explains every headline metric with its inputs and formula', async () => {
    const { getPathname } = await openApp('/dashboard');

    await fireEvent.press(screen.getByTestId('metric-safe'));
    await waitFor(() => expect(getPathname()).toBe('/explain/safe'));

    expect(screen.getByText('What went in')).toBeTruthy();
    expect(screen.getByText('Reserved commitments')).toBeTruthy();
    expect(screen.getByText('-AED 7,080.00')).toBeTruthy();
  });

  it('shows a shortfall for a what-if purchase and leaves the real plan unchanged', async () => {
    const { getPathname } = await openApp('/dashboard');

    await fireEvent.press(screen.getByTestId('open-scenario'));
    await waitFor(() => expect(getPathname()).toBe('/scenario'));
    await fireEvent.press(screen.getByTestId('scenario-toggle'));

    expect(screen.getByTestId('scenario-result')).toBeTruthy();
    expect(screen.getByText(/Short by AED 1,230.00/)).toBeTruthy();
    // Baseline card still shows the untouched plan.
    expect(screen.getAllByText('AED 1,770.00').length).toBeGreaterThan(0);

    // Leaving the scenario discards it; the dashboard still shows the real plan.
    await fireEvent.press(screen.getByTestId('scenario-toggle'));
    expect(screen.queryByTestId('scenario-result')).toBeNull();
  });

  it('records only privacy-safe analytics events through the journey', async () => {
    const { getPathname } = await openApp();

    await fireEvent.press(screen.getByTestId('start-button'));
    await waitFor(() => expect(getPathname()).toBe('/onboarding'));
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    const serialized = JSON.stringify(getRecordedEvents());
    expect(getRecordedEvents().map((e) => e.name)).toEqual([
      'onboarding_started',
      'onboarding_completed',
    ]);
    expect(serialized).not.toMatch(/12000|15000|1200000|salary|balance/i);
  });

  it('settings data buttons always give feedback', async () => {
    await openApp('/settings');

    expect(screen.queryByTestId('data-message')).toBeNull();
    await fireEvent.press(screen.getByTestId('delete-data'));
    expect(screen.getByText(/there is nothing to delete/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('export-data'));
    expect(screen.getByText(/Export is not available in this prototype yet/)).toBeTruthy();
  });

  it('records onboarding_completed only once even if the numbers are edited again', async () => {
    const { getPathname } = await openApp('/onboarding');

    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await act(async () => {
      router.push('/onboarding');
    });
    await waitFor(() => expect(getPathname()).toBe('/onboarding'));
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    const completed = getRecordedEvents().filter((e) => e.name === 'onboarding_completed');
    expect(completed).toHaveLength(1);
  });
  it('settings shows assumptions and a never-blocked data section', async () => {
    await openApp('/settings');

    expect(screen.getByText('Plan until: the day before next payday')).toBeTruthy();
    expect(screen.getByTestId('export-data')).toBeTruthy();
  });
});
