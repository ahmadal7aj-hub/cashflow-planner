import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import Commitments from '../app/commitments';
import EditItem from '../app/edit/[kind]/[id]';
import LinkAccount from '../app/link';
import MonthlyPlan from '../app/monthly-plan';
import Settings from '../app/settings';
import TabsLayout from '../app/(tabs)/_layout';
import Dashboard from '../app/(tabs)/dashboard';
import Income from '../app/(tabs)/income';
import Insights from '../app/(tabs)/insights';
import Savings from '../app/(tabs)/savings';
import Shared from '../app/(tabs)/shared';
import Spending from '../app/(tabs)/spending';

const routes = {
  _layout: RootLayout,
  commitments: Commitments,
  link: LinkAccount,
  settings: Settings,
  'monthly-plan': MonthlyPlan,
  'edit/[kind]/[id]': EditItem,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/dashboard': Dashboard,
  '(tabs)/income': Income,
  '(tabs)/insights': Insights,
  '(tabs)/savings': Savings,
  '(tabs)/shared': Shared,
  '(tabs)/spending': Spending,
};

async function open(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

async function link(getPathname: () => string) {
  await fireEvent.changeText(screen.getByTestId('input-partner-username'), 'sara_ahmed');
  await fireEvent.press(screen.getByTestId('link-submit'));
  expect(screen.getByTestId('link-status')).toBeTruthy();
  expect(getPathname()).toBe('/link');
}

describe('Shared dashboard preview', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-03T08:00:00') });
  });
  afterEach(() => jest.useRealTimers());

  it('hides the Shared tab until an account is linked, then shows it', async () => {
    const { getPathname } = await open('/link');
    expect(screen.queryByTestId('tab-shared')).toBeNull();

    await link(getPathname);
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));
    expect(screen.getByTestId('tab-shared')).toBeTruthy();
    expect(screen.getByTestId('shared-empty')).toBeTruthy();
  });

  it('rejects a too-short username', async () => {
    await open('/link');
    await fireEvent.changeText(screen.getByTestId('input-partner-username'), 'ab');
    await fireEvent.press(screen.getByTestId('link-submit'));
    expect(screen.getByTestId('error-partner-username')).toBeTruthy();
    expect(screen.queryByTestId('link-status')).toBeNull();
  });

  it('shares a 5,000 savings deposit and rent, and shows them on the Shared dashboard', async () => {
    const { getPathname } = await open('/link');
    await link(getPathname);

    // Add AED 5,000 to savings and mark it Shared.
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));
    await fireEvent.press(screen.getByTestId('tab-savings'));
    await fireEvent.press(screen.getByTestId('savings-add'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-in/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '5000');
    await fireEvent.press(screen.getByTestId('share-yes'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    // Share the rent bill (AED 3,500, due in 4 days).
    await fireEvent.press(screen.getByTestId('tab-overview'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    await fireEvent.press(screen.getByTestId('open-settings'));
    await fireEvent.press(screen.getByTestId('open-link'));
    await waitFor(() => expect(getPathname()).toBe('/link'));
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));

    expect(screen.getByTestId('shared-savings')).toBeTruthy();
    // 5,000 mine + 8,000 from the sample partner.
    expect(screen.getByText('AED 13,000.00')).toBeTruthy();
    expect(screen.getAllByText('AED 5,000.00').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('shared-empty')).toBeNull();
  });

  it('shares a bill and can stop sharing it again', async () => {
    const { getPathname } = await open('/link');
    await link(getPathname);
    await fireEvent.press(screen.getByTestId('link-open-shared'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));

    await act(async () => router.push('/edit/fixed/rent'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/rent'));
    await fireEvent.press(screen.getByTestId('share-yes'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/shared'));

    expect(screen.getByTestId('shared-line-exp:rent')).toBeTruthy();
    expect(screen.getAllByText('AED 3,500.00').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('unshare-exp:rent'));
    expect(screen.queryByTestId('shared-line-exp:rent')).toBeNull();
  });

  it('keeps the individual dashboard private and unaffected by sharing', async () => {
    await open('/dashboard');
    expect(screen.getAllByText('AED 1,770.00').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('shared-screen')).toBeNull();
  });

  it('offers to link from a bill form when not linked', async () => {
    await open('/edit/fixed/rent');
    expect(screen.getByTestId('share-not-linked')).toBeTruthy();
  });
});
