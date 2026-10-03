import { Share } from 'react-native';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { installTestLifecycle, openApp, salary, userWith } from '../testing/app';

installTestLifecycle();
afterEach(() => jest.restoreAllMocks());

describe('Settings > Export my data', () => {
  it('offers a JSON copy of everything saved on the phone to the share sheet', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await openApp('/settings', { seed: userWith({ income: [salary(12000)] }) });

    await fireEvent.press(screen.getByTestId('export-data'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    const message = spy.mock.calls[0]![0].message as string;
    const data = JSON.parse(message);
    expect(data.schemaVersion).toBe(2);
    expect(data.plan.income[0]).toMatchObject({ name: 'Salary', amount: 1200000 });
    expect(data.plan.savings.opening).toMatchObject({ amount: 500000, date: '2026-09-01' });
    await waitFor(() => expect(screen.getByTestId('data-message')).toBeTruthy());
  });

  it('says so, and changes nothing, when sharing fails', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('no'));
    await openApp('/settings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('export-data'));
    await waitFor(() =>
      expect(screen.getByText('The copy could not be shared. Nothing was changed.')).toBeTruthy(),
    );
  });

  it('deleting everything at once is explained honestly', async () => {
    await openApp('/settings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('delete-data'));
    expect(screen.getByText(/Deleting everything at once is not available yet/)).toBeTruthy();
  });
});
