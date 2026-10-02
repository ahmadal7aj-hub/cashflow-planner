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

describe('tabs and Spending dashboard (P1-01)', () => {
  it('switches between Overview and Spending from the tab bar', async () => {
    const { getPathname } = await openApp('/dashboard');

    await fireEvent.press(screen.getByTestId('tab-spending'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));
    expect(screen.getByTestId('spending-screen')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tab-overview'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
  });

  it('shows the headline spending numbers from the sample plan', async () => {
    await openApp('/spending');

    expect(screen.getByText('AED 1,915.00')).toBeTruthy(); // everyday spent so far
    expect(screen.getByText('AED 7,080.00')).toBeTruthy(); // bills before payday
    expect(screen.getByText('AED 680.00')).toBeTruthy(); // discretionary left
    expect(screen.getByText('60% of this pay cycle has passed. 12 days to payday.')).toBeTruthy();
  });

  it('compares discretionary budgets with safe-to-spend', async () => {
    await openApp('/spending');
    expect(
      screen.getByText('Those budgets fit inside your safe to spend, with AED 1,090.00 to spare.'),
    ).toBeTruthy();
  });

  it('says in words whether each budget is on track, ahead of pace or over', async () => {
    await openApp('/spending');

    expect(
      screen.getByLabelText('Entertainment: AED 275.00 of AED 250.00. Over budget.'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText('Food delivery: AED 260.00 of AED 300.00. Ahead of pace.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Groceries: AED 650.00 of AED 1,800.00. On track.')).toBeTruthy();
  });

  it('breaks the month down by type, largest first, with shares', async () => {
    await openApp('/spending');

    expect(screen.getByLabelText('Housing: AED 3,500.00, 24%')).toBeTruthy();
    expect(screen.getByLabelText('Family and education: AED 3,000.00, 20%')).toBeTruthy();
    expect(screen.getByLabelText('Food: AED 2,700.00, 18%')).toBeTruthy();
  });

  it('adds up the UAE driving costs and shows the history trend', async () => {
    await openApp('/spending');

    expect(
      screen.getByText('Salik, parking and fuel: AED 270.00 spent of AED 770.00 this cycle.'),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Spending over the last six cycles, from AED 13,900.00 to AED 14,600.00.',
      ),
    ).toBeTruthy();
  });

  it('updates when the user edits an everyday budget', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('expense-dining'));
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/dining'));
    await fireEvent.changeText(screen.getByTestId('input-spent'), '700');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    await fireEvent.press(screen.getByTestId('tab-spending'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));

    expect(
      screen.getByLabelText('Dining out: AED 700.00 of AED 600.00. Over budget.'),
    ).toBeTruthy();
    // 260 + 40 + 380 + 0 became 0 + 40 + 380 + 0 = 420 left.
    expect(screen.getByText('AED 420.00')).toBeTruthy();
  });
});
