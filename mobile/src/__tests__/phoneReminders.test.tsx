import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { bill, installTestLifecycle, openApp, userWith } from '../testing/app';

installTestLifecycle();

type Mock = {
  granted: boolean;
  canAskAgain: boolean;
  answer: boolean;
  scheduled: {
    identifier: string;
    content: { title: string; body: string };
    trigger: { date: Date };
  }[];
};
const mock = (Notifications as unknown as { __state: Mock }).__state;

beforeEach(async () => {
  mock.granted = false;
  mock.canAskAgain = true;
  mock.answer = true;
  mock.scheduled.length = 0;
  await AsyncStorage.clear();
});

// Today is 15 Oct 2026, 08:00. Rent is due on the 25th with a reminder 3 days before.
const seed = () => {
  const rent = { ...bill('rent', 'rent', 'Rent', 4500, '2026-10-25'), reminderDaysBefore: 3 };
  return userWith({ expenses: [rent] });
};

describe('phone reminders', () => {
  it('are off at first and nothing is scheduled', async () => {
    await openApp('/settings', { seed: seed() });
    expect(screen.getByTestId('notify-state')).toHaveTextContent(/are off/);
    expect(mock.scheduled).toHaveLength(0);
  });

  it('turning them on asks the phone, then schedules 9:00 on the reminder day with no amount in the text', async () => {
    await openApp('/settings', { seed: seed() });
    await fireEvent.press(screen.getByTestId('notify-toggle'));
    await waitFor(() => expect(screen.getByTestId('notify-state')).toHaveTextContent(/are on/));
    await waitFor(() => expect(mock.scheduled).toHaveLength(1));
    const n = mock.scheduled[0]!;
    expect(n.trigger.date).toEqual(new Date(2026, 9, 22, 9, 0, 0));
    expect(n.content.title).toBe('Bill due soon');
    expect(n.content.body).toBe('Rent is due in 3 days (25 Oct 2026).');
    expect(JSON.stringify(n)).not.toMatch(/4,?500|AED/);
    expect(await AsyncStorage.getItem('cashflow.notifications.on')).toBe('1');
  });

  it('stays off and explains when the phone refuses permission', async () => {
    mock.answer = false;
    await openApp('/settings', { seed: seed() });
    await fireEvent.press(screen.getByTestId('notify-toggle'));
    await waitFor(() => expect(screen.getByTestId('notify-message')).toBeTruthy());
    expect(screen.getByTestId('notify-message').props.children).toMatch(/did not allow/);
    expect(screen.getByTestId('notify-state')).toHaveTextContent(/are off/);
    expect(mock.scheduled).toHaveLength(0);
  });

  it('turning them off cancels what was waiting', async () => {
    await openApp('/settings', { seed: seed() });
    await fireEvent.press(screen.getByTestId('notify-toggle'));
    await waitFor(() => expect(mock.scheduled).toHaveLength(1));
    await fireEvent.press(screen.getByTestId('notify-toggle'));
    await waitFor(() => expect(mock.scheduled).toHaveLength(0));
    expect(screen.getByTestId('notify-state')).toHaveTextContent(/are off/);
    expect(await AsyncStorage.getItem('cashflow.notifications.on')).toBe('0');
  });

  it('come back on when the app reopens, as long as the phone still allows them', async () => {
    mock.granted = true;
    await AsyncStorage.setItem('cashflow.notifications.on', '1');
    await openApp('/settings', { seed: seed() });
    await waitFor(() => expect(screen.getByTestId('notify-state')).toHaveTextContent(/are on/));
    await waitFor(() => expect(mock.scheduled).toHaveLength(1));
  });

  it('stay off after a reopen if the phone took the permission away', async () => {
    mock.granted = false;
    mock.canAskAgain = false;
    await AsyncStorage.setItem('cashflow.notifications.on', '1');
    await openApp('/settings', { seed: seed() });
    expect(screen.getByTestId('notify-state')).toHaveTextContent(/are off/);
    expect(mock.scheduled).toHaveLength(0);
  });
});
