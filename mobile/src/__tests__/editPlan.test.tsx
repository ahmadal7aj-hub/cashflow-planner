import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import Commitments from '../app/commitments';
import Dashboard from '../app/dashboard';
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
  dashboard: Dashboard,
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
    await fireEvent.changeText(screen.getByTestId('input-days'), '3');
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
    await fireEvent.changeText(screen.getByTestId('input-days'), '5');
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

  it('rejects an empty amount with an accessible error and does not save', async () => {
    const { getPathname } = await openApp('/edit/fixed/new');

    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-amount')).toBeTruthy();
    expect(getPathname()).toBe('/edit/fixed/new');
  });

  it('rejects invalid days', async () => {
    await openApp('/edit/income/new');

    await fireEvent.changeText(screen.getByTestId('input-amount'), '1000');
    await fireEvent.changeText(screen.getByTestId('input-days'), '400');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-days')).toBeTruthy();
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
