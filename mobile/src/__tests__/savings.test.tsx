import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import Dashboard from '../app/(tabs)/dashboard';
import Savings from '../app/(tabs)/savings';
import Spending from '../app/(tabs)/spending';
import Commitments from '../app/commitments';
import EditItem from '../app/edit/[kind]/[id]';
import Explain from '../app/explain/[metric]';
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
  '(tabs)/savings': Savings,
  '(tabs)/spending': Spending,
  scenario: Scenario,
  settings: Settings,
  'warning/[id]': Warning,
  'explain/[metric]': Explain,
  'edit/[kind]/[id]': EditItem,
};

/** RNTL v14 renders asynchronously and expo-router attaches getPathname to the returned promise. */
async function openApp(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

describe('Savings dashboard (P1-01)', () => {
  it('is reachable from the tab bar', async () => {
    const { getPathname } = await openApp('/dashboard');
    await fireEvent.press(screen.getByTestId('tab-savings'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(screen.getByTestId('savings-screen')).toBeTruthy();
  });

  it('shows the headline savings numbers', async () => {
    await openApp('/savings');

    expect(
      screen.getByLabelText(/Saved each month: AED 1,200.00. 6.8% of your income/),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Total saved: AED 23,600.00/)).toBeTruthy();
    expect(
      screen.getByLabelText(/Emergency cover: 1.4 months. Building toward 3 months/),
    ).toBeTruthy();
  });

  it('explains the emergency fund in months of essential spending', async () => {
    await openApp('/savings');
    expect(
      screen.getByText(
        'Your essential spending is about AED 12,808.33 a month. Many people aim for 3 to 6 months. Three months is AED 38,424.99, and you are AED 20,424.99 away.',
      ),
    ).toBeTruthy();
  });

  it('shows every goal with a written status', async () => {
    await openApp('/savings');

    expect(
      screen.getByLabelText(
        'Emergency fund. AED 18,000.00 of AED 45,000.00 · 40%. About 54 months at AED 500.00 a month',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Summer travel. AED 2,400.00 of AED 8,000.00 · 30%. ▲ Needs AED 1,120.00 a month to finish on time',
      ),
    ).toBeTruthy();
  });

  it('plans big bills: how much to set aside each month to be ready', async () => {
    await openApp('/savings');

    expect(screen.getByText('Due in 40 days · set aside AED 4,500.00 a month')).toBeTruthy();
    expect(screen.getByText('Due in 95 days · set aside AED 700.00 a month')).toBeTruthy();
    expect(screen.getByText('Due in 200 days · set aside AED 214.29 a month')).toBeTruthy();
  });

  it('shows what is left unallocated each month', async () => {
    await openApp('/savings');
    expect(
      screen.getByText(
        'After your average spending and your savings, about AED 1,891.67 a month is unallocated.',
      ),
    ).toBeTruthy();
  });

  it('shows a clearly labelled gratuity estimate', async () => {
    await openApp('/savings');

    expect(screen.getByText('AED 25,200.00')).toBeTruthy();
    expect(
      screen.getByText('Based on 4 years of service and a basic wage of AED 9,000.00 a month.'),
    ).toBeTruthy();
    expect(screen.getByText(/An illustration only/)).toBeTruthy();
    expect(screen.getByText(/confirm with your employer or the labour authority/)).toBeTruthy();
  });

  it('recomputes the gratuity when service details change', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('edit-employment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/employment/me'));
    await fireEvent.changeText(screen.getByTestId('input-years'), '7');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByText('AED 49,500.00')).toBeTruthy(); // 5 x 21 + 2 x 30 = 165 days x 300
  });

  it('rejects invalid service details', async () => {
    await openApp('/edit/employment/me');

    await fireEvent.changeText(screen.getByTestId('input-years'), 'abc');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-years')).toBeTruthy();
  });

  it('pausing a goal lowers the monthly savings figure', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('goal-gold'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/gold'));
    await fireEvent.press(screen.getByTestId('enabled-no'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByLabelText(/Saved each month: AED 900.00/)).toBeTruthy();
  });

  it('moving the emergency-fund flag to another goal changes the cover', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('goal-gold'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/gold'));
    await fireEvent.press(screen.getByTestId('emergency-yes'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    // Gold has 3,200 saved: 3,200 / 12,808.33 = 0.2 months, and the old emergency flag was cleared.
    expect(screen.getByLabelText(/Emergency cover: 0.2 months. Under 1 month/)).toBeTruthy();
  });

  it('adds a new goal', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('add-goal'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/new'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Hajj fund');
    await fireEvent.changeText(screen.getByTestId('input-target'), '30000');
    await fireEvent.changeText(screen.getByTestId('input-monthly'), '1000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByTestId('goal-goal-4')).toBeTruthy();
    expect(screen.getByLabelText(/Saved each month: AED 2,200.00/)).toBeTruthy();
  });

  it('shows the saving trend with a text summary', async () => {
    await openApp('/savings');
    expect(
      screen.getByLabelText(
        'Amount saved each cycle over the last six cycles, from AED 1,500.00 to AED 1,200.00.',
      ),
    ).toBeTruthy();
  });
});
