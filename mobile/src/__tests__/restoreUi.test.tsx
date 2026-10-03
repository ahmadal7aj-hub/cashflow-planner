import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { savePlan } from '../domain/persistence';
import { addTransaction } from '../domain/planOps';
import { aed, everyday, installTestLifecycle, openApp, salary, userWith } from '../testing/app';

installTestLifecycle();

it('the screens show what was saved on the device', async () => {
  const plan = addTransaction(
    userWith({
      income: [salary(12000)],
      expenses: [everyday('groc', 'groceries', 'Groceries', 3000)],
    }),
    { date: '2026-10-05', categoryId: 'groceries', amount: aed(500), note: '' },
    '2026-10-15',
  );
  await savePlan(AsyncStorage, plan);

  await openApp('/spending', { seed: 'storage' });
  await waitFor(() => expect(screen.getByTestId('cat-groceries')).toBeTruthy());
  const card = within(screen.getByTestId('cat-groceries'));
  expect(card.getByLabelText('Budget: AED 3,000.00')).toBeTruthy();
  expect(card.getByLabelText('Spent: AED 500.00')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('tab-income'));
  await waitFor(() => expect(screen.getByTestId('income-salary')).toBeTruthy());
  expect(screen.getByText('AED 12,000.00')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('tab-savings'));
  await waitFor(() => expect(screen.getByTestId('total-savings-card')).toBeTruthy());
  // 5,000 opening + 1,000 target saved from September (salary received, nothing spent).
  expect(within(screen.getByTestId('total-savings-card')).getByText('AED 6,000.00')).toBeTruthy();
});
