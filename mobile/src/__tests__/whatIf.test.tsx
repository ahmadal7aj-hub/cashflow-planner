import { fireEvent, screen } from 'expo-router/testing-library';

import { demoPlan } from '../domain/sampleData';
import { installTestLifecycle, openApp, TODAY } from '../testing/app';

installTestLifecycle();

const open = () => openApp('/scenario', { seed: demoPlan(TODAY) });

describe('the what-if purchase takes any item and price', () => {
  it('starts with the sample laptop: AED 3,000 is short by AED 1,230', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('scenario-toggle'));
    expect(screen.getByText(/Short by AED 1,230.00/)).toBeTruthy();
  });

  it('a bicycle for AED 2,000 is short by AED 230, and the result updates as the price changes', async () => {
    await open();
    await fireEvent.changeText(screen.getByTestId('input-scenario-name'), 'Bicycle');
    await fireEvent.changeText(screen.getByTestId('input-scenario-price'), '2000');
    await fireEvent.press(screen.getByTestId('scenario-toggle'));
    expect(screen.getByText('With Bicycle')).toBeTruthy();
    expect(screen.getByText(/Short by AED 230.00/)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-scenario-price'), '500');
    expect(screen.queryByText(/Short by/)).toBeNull();
    expect(screen.getAllByText('AED 1,270.00').length).toBeGreaterThan(0);
  });

  it('refuses a missing or invalid price, and never changes the real plan', async () => {
    await open();
    await fireEvent.changeText(screen.getByTestId('input-scenario-price'), 'abc');
    expect(screen.getByTestId('error-scenario-price')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('scenario-toggle'));
    expect(screen.queryByTestId('scenario-result')).toBeNull();
    // The baseline card still shows the untouched plan.
    expect(screen.getAllByText('AED 1,770.00').length).toBeGreaterThan(0);
  });
});
