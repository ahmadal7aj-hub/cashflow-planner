import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { clearRecordedEvents, getRecordedEvents } from '../analytics/events';
import Commitments from '../app/commitments';
import Dashboard from '../app/dashboard';
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
  dashboard: Dashboard,
  scenario: Scenario,
  settings: Settings,
  'warning/[id]': Warning,
  'explain/[metric]': Explain,
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

    expect(screen.getByText('AED 1,750.00')).toBeTruthy(); // safe to spend
    expect(screen.getByText('AED 145.83 per day')).toBeTruthy();
    expect(screen.getByText('AED 2,050.00')).toBeTruthy(); // forecast balance
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

    await fireEvent.changeText(screen.getByTestId('input-balance'), '10000');
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));

    expect(screen.getByText('AED 3,550.00')).toBeTruthy(); // 1,750 + 1,800 more cash
  });

  it('opens a warning and explains why (P3-04 preview)', async () => {
    const { getPathname } = await openApp('/dashboard');

    await fireEvent.press(screen.getByTestId('warning-due-rent'));
    await waitFor(() => expect(getPathname()).toBe('/warning/due-rent'));

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
    expect(screen.getByText('-AED 5,450.00')).toBeTruthy();
  });

  it('shows a shortfall for a what-if purchase and leaves the real plan unchanged', async () => {
    const { getPathname } = await openApp('/dashboard');

    await fireEvent.press(screen.getByTestId('open-scenario'));
    await waitFor(() => expect(getPathname()).toBe('/scenario'));
    await fireEvent.press(screen.getByTestId('scenario-toggle'));

    expect(screen.getByTestId('scenario-result')).toBeTruthy();
    expect(screen.getByText(/Short by AED 1,250.00/)).toBeTruthy();
    // Baseline card still shows the untouched plan.
    expect(screen.getAllByText('AED 1,750.00').length).toBeGreaterThan(0);

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
    expect(serialized).not.toMatch(/8200|15000|820000|salary|balance/i);
  });

  it('settings shows assumptions and a never-blocked data section', async () => {
    await openApp('/settings');

    expect(screen.getByText('Plan until: the day before next payday')).toBeTruthy();
    expect(screen.getByTestId('export-data')).toBeTruthy();
  });
});
