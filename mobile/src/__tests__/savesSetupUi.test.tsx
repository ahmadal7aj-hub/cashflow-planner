import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { loadPlan } from '../domain/persistence';
import { aed, installTestLifecycle, openApp } from '../testing/app';

installTestLifecycle();

async function saved() {
  const r = await loadPlan(AsyncStorage, 'test');
  if (r.status !== 'ok') throw new Error(`nothing saved: ${r.status}`);
  return r.plan;
}

describe('the first-run questions save on the device', () => {
  it('first-run savings answers are saved', async () => {
    const { getPathname } = await openApp('/setup');
    await fireEvent.changeText(screen.getByTestId('input-opening'), '5000');
    await fireEvent.changeText(screen.getByTestId('input-target'), '1000');
    await fireEvent.press(screen.getByTestId('setup-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));

    await waitFor(async () => expect((await saved()).setupDone).toBe(true));
    const plan = await saved();
    expect(plan.savings.opening).toEqual({ amount: aed(5000), date: '2026-10-15' });
    expect(plan.savings.targets).toEqual([{ from: '2026-10', amount: aed(1000) }]);
  });
});
