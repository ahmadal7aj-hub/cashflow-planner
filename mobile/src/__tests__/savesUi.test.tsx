import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { loadPlan } from '../domain/persistence';
import { aed, installTestLifecycle, openApp, pickDate } from '../testing/app';

installTestLifecycle();

async function saved() {
  const r = await loadPlan(AsyncStorage, 'test');
  if (r.status !== 'ok') throw new Error(`nothing saved: ${r.status}`);
  return r.plan;
}

describe('the screens save what you enter on the device', () => {
  it('income, a budget and a spending record are written to storage', async () => {
    const { getPathname } = await openApp('/income');
    await waitFor(() => expect(screen.getByText('No income added yet')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('add-income'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '12000');
    await pickDate('next-date-toggle', '2026-10-25');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));

    await fireEvent.press(screen.getByTestId('tab-budget'));
    await fireEvent.press(screen.getAllByTestId('add-variable')[0]!);
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/new'));
    await fireEvent.press(screen.getByTestId('category-groceries'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '3000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/budget'));

    await fireEvent.press(screen.getByTestId('tab-spending'));
    await fireEvent.press(screen.getAllByTestId('add-spending')[0]!);
    await waitFor(() => expect(getPathname()).toBe('/edit/expense/new'));
    await fireEvent.press(screen.getByTestId('category-groceries'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));

    await waitFor(async () => expect((await saved()).transactions).toHaveLength(1));
    const plan = await saved();
    expect(plan.income[0]).toMatchObject({ name: 'Salary', amount: aed(12000) });
    expect(plan.expenses[0]).toMatchObject({ categoryId: 'groceries', amount: aed(3000) });
    expect(plan.transactions[0]).toMatchObject({ categoryId: 'groceries', amount: aed(500) });
  });
});
