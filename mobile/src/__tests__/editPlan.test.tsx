import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import Commitments from '../app/commitments';
import TabsLayout from '../app/(tabs)/_layout';
import Dashboard from '../app/(tabs)/dashboard';
import Income from '../app/(tabs)/income';
import Insights from '../app/(tabs)/insights';
import Savings from '../app/(tabs)/savings';
import Spending from '../app/(tabs)/spending';
import EditItem from '../app/edit/[kind]/[id]';
import Explain from '../app/explain/[metric]';
import Index from '../app/index';
import Investments from '../app/investments';
import Onboarding from '../app/onboarding';
import Scenario from '../app/scenario';
import Settings from '../app/settings';
import Warning from '../app/warning/[id]';

const routes = {
  _layout: RootLayout,
  index: Index,
  investments: Investments,
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

/** RNTL v14 renders asynchronously and expo-router attaches getPathname to the returned promise. */
async function openApp(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

async function goToDashboard(getPathname: () => string) {
  await fireEvent.press(screen.getByTestId('commitments-continue'));
  await waitFor(() => expect(getPathname()).toBe('/dashboard'));
}

/** Today is pinned so date maths in the tests is deterministic. */
beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00') });
});
afterAll(() => {
  jest.useRealTimers();
});

/** Open a date field and tap a day in its calendar. */
async function pickDate(toggleTestId: string, iso: string) {
  await fireEvent.press(screen.getByTestId(toggleTestId));
  await fireEvent.press(screen.getByTestId(`date-day-${iso}`));
}

describe('income and expenses editor (P1-01)', () => {
  it('lists income, bills and everyday budgets with UAE categories', async () => {
    await openApp('/commitments');

    expect(screen.getByTestId('income-salary')).toBeTruthy();
    expect(screen.getByTestId('expense-rent')).toBeTruthy();
    expect(screen.getByTestId('expense-salik')).toBeTruthy();
    expect(screen.getByTestId('expense-parking')).toBeTruthy();
    expect(screen.getByText('Money sent home')).toBeTruthy();
    expect(screen.getByText('AED 62.00 spent of AED 150.00')).toBeTruthy(); // Salik
  });

  it('adding a bill due before payday lowers safe-to-spend by exactly its amount', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('add-fixed'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/new'));
    await fireEvent.press(screen.getByTestId('category-chiller'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '600');
    await pickDate('due-date-toggle', '2026-10-06');
    await fireEvent.press(screen.getByTestId('edit-save'));

    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    expect(screen.getByText('Chiller / district cooling')).toBeTruthy();
    await goToDashboard(getPathname);
    expect(screen.getByText('AED 1,170.00')).toBeTruthy(); // 1,770 - 600
  });

  it('editing an everyday budget changes what is still expected', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('expense-groceries'));
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/groceries'));
    await fireEvent.changeText(screen.getByTestId('input-spent'), '1000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await goToDashboard(getPathname);
    expect(screen.getByText('AED 2,120.00')).toBeTruthy(); // 1,770 + 350 less still expected
  });

  it('deleting a bill raises safe-to-spend', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('expense-gym'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/gym'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    expect(screen.queryByTestId('expense-gym')).toBeNull();

    await goToDashboard(getPathname);
    expect(screen.getByText('AED 1,970.00')).toBeTruthy();
  });

  it('income arriving before payday raises safe-to-spend', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('income-side'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/side'));
    await pickDate('next-date-toggle', '2026-10-08');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await goToDashboard(getPathname);
    expect(screen.getByText('AED 3,270.00')).toBeTruthy(); // 1,770 + 1,500
  });

  it('a new savings goal is reserved in the forecast', async () => {
    const { getPathname } = await openApp('/commitments');

    await act(async () => {
      router.push('/edit/goal/new');
    });
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/new'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Hajj fund');
    await fireEvent.changeText(screen.getByTestId('input-target'), '30000');
    await fireEvent.changeText(screen.getByTestId('input-monthly'), '500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await goToDashboard(getPathname);
    expect(screen.getByText('AED 1,270.00')).toBeTruthy(); // 1,770 - 500 set aside
  });

  it('the explanation lists income that arrives before payday, so the rows add up', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('income-side'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/side'));
    await pickDate('next-date-toggle', '2026-10-08');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    await fireEvent.press(screen.getByTestId('metric-safe'));
    await waitFor(() => expect(getPathname()).toBe('/explain/safe'));

    expect(screen.getByLabelText('Expected income in plan: AED 1,500.00')).toBeTruthy();
    expect(screen.getByLabelText('Result: AED 3,270.00')).toBeTruthy();
  });

  it('rejects a salary date more than 62 days away', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('income-salary'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/salary'));
    await fireEvent.press(screen.getByTestId('next-date-toggle'));
    await fireEvent.press(screen.getByTestId('date-next'));
    await fireEvent.press(screen.getByTestId('date-next'));
    await fireEvent.press(screen.getByTestId('date-day-2026-12-31'));
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByText('Choose a salary date within the next 62 days.')).toBeTruthy();
    expect(getPathname()).toBe('/edit/income/salary');
  });

  it('rejects an absurdly large amount instead of overflowing', async () => {
    await openApp('/edit/fixed/new');

    await fireEvent.changeText(screen.getByTestId('input-amount'), '99999999999999999999');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-amount')).toBeTruthy();
  });
  it('rejects an empty amount with an accessible error and does not save', async () => {
    const { getPathname } = await openApp('/edit/fixed/new');

    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-amount')).toBeTruthy();
    expect(getPathname()).toBe('/edit/fixed/new');
  });

  it('requires a next payment date', async () => {
    await openApp('/edit/income/new');

    await fireEvent.changeText(screen.getByTestId('input-amount'), '1000');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-next-date')).toBeTruthy();
  });

  it('shows a friendly message for an item that does not exist', async () => {
    await openApp('/edit/fixed/nope');
    expect(screen.getByText('This item no longer exists.')).toBeTruthy();
  });

  it('reset restores the sample data', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('expense-gym'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/gym'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    expect(screen.queryByTestId('expense-gym')).toBeNull();

    await fireEvent.press(screen.getByTestId('reset-sample'));
    expect(screen.getByTestId('expense-gym')).toBeTruthy();
  });
});
