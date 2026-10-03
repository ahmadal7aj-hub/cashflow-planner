import { Alert } from 'react-native';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { addTransaction } from '../domain/planOps';
import {
  aed,
  dashboardWorld,
  everyday,
  installTestLifecycle,
  openApp,
  salary,
  swipeLeft,
  userWith,
} from '../testing/app';

installTestLifecycle();

const total = () => within(screen.getByTestId('total-savings-card'));

describe('the Savings planning page keeps the four savings ideas separate', () => {
  it('shows the existing balance, the monthly target, the projection and finished months', async () => {
    await openApp('/savings', { seed: dashboardWorld() });
    expect(total().getByText('AED 14,000.00')).toBeTruthy(); // 10,000 + Aug 1,000 + Sep 1,000 + 2,000 added
    expect(total().getByText('Existing savings: AED 10,000.00 as of 2 Aug 2026')).toBeTruthy();
    expect(within(screen.getByTestId('target-card')).getByText('AED 1,000.00')).toBeTruthy();
    expect(screen.getByText('This month (projected)')).toBeTruthy();
    expect(screen.getByText(/An estimate, not money saved yet/)).toBeTruthy();
    expect(screen.getByTestId('closed-2026-08')).toBeTruthy();
    expect(screen.getByTestId('closed-2026-09')).toBeTruthy();
    expect(screen.getByText('Month result: September 2026')).toBeTruthy();
  });

  it('a target is not counted as saved: with a target and no history, savings equal the opening balance', async () => {
    await openApp('/savings', { seed: userWith() });
    // userWith opens on 1 Sep 2026; no income, no spending: September closes at zero.
    expect(total().getByText('AED 5,000.00')).toBeTruthy();
    expect(within(screen.getByTestId('target-card')).getByText('AED 1,000.00')).toBeTruthy();
  });
});

describe('overspending reduces savings (the monthly result, not each category)', () => {
  it('overspending of 300 reduces the monthly saving: savings grow by 700, not 1,000', async () => {
    const base = userWith({
      income: [salary(5000, '2026-09-25')],
      expenses: [everyday('groc', 'groceries', 'Groceries', 4000)],
    });
    const plan = addTransaction(
      base,
      { date: '2026-09-12', categoryId: 'groceries', amount: aed(4300), note: '' },
      '2026-09-12',
    );
    await openApp('/savings', { seed: plan });
    expect(total().getByText('AED 5,700.00')).toBeTruthy();
    expect(within(screen.getByTestId('closed-2026-09')).getByText('+AED 700.00')).toBeTruthy();
  });

  it('overspending of 1,200 adds nothing and takes 200 from existing savings', async () => {
    const base = userWith({
      income: [salary(5000, '2026-09-25')],
      expenses: [everyday('groc', 'groceries', 'Groceries', 4000)],
    });
    const plan = addTransaction(
      base,
      { date: '2026-09-12', categoryId: 'groceries', amount: aed(5200), note: '' },
      '2026-09-12',
    );
    await openApp('/savings', { seed: plan });
    expect(total().getByText('AED 4,800.00')).toBeTruthy();
    expect(within(screen.getByTestId('closed-2026-09')).getByText('-AED 200.00')).toBeTruthy();
  });

  it('underspending in one category offsets overspending in another', async () => {
    let plan = userWith({
      income: [salary(5000, '2026-09-25')],
      expenses: [
        everyday('groc', 'groceries', 'Groceries', 2000),
        everyday('dine', 'dining', 'Dining', 2000),
      ],
    });
    plan = addTransaction(
      plan,
      { date: '2026-09-10', categoryId: 'groceries', amount: aed(2500), note: '' },
      '2026-09-10',
    );
    plan = addTransaction(
      plan,
      { date: '2026-09-11', categoryId: 'dining', amount: aed(1500), note: '' },
      '2026-09-11',
    );
    await openApp('/savings', { seed: plan });
    // Groceries over by 500, dining under by 500: overall on plan, so the full 1,000 is saved.
    expect(total().getByText('AED 6,000.00')).toBeTruthy();
  });
});

describe('adding and taking out savings', () => {
  it('adding money raises the total and is not counted as income', async () => {
    const { getPathname } = await openApp('/savings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('savings-add'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-in/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(total().getByText('AED 5,500.00')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(
      within(screen.getByTestId('income-summary')).getByLabelText('Received: AED 0.00'),
    ).toBeTruthy();
  });

  it('taking money out lowers the total and is not counted as spending', async () => {
    const { getPathname } = await openApp('/savings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('savings-take'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-out/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '800');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(total().getByText('AED 4,200.00')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tab-spending'));
    await waitFor(() => expect(screen.getByText('No spending recorded yet')).toBeTruthy());
  });

  it('refuses to take out more than is saved', async () => {
    const { getPathname } = await openApp('/savings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('savings-take'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-out/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '9000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-amount').props.children).toBe(
      'You only have AED 5,000.00 saved.',
    );
    expect(getPathname()).toBe('/edit/savings-out/new');
  });

  it('rejects zero and junk amounts for a transfer', async () => {
    const { getPathname } = await openApp('/savings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('savings-add'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-in/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '0');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-amount')).toBeTruthy();
  });

  it('deleting a manual deposit by swipe recalculates the total', async () => {
    const { getPathname } = await openApp('/savings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('savings-add'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-in/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(total().getByText('AED 5,500.00')).toBeTruthy();

    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await swipeLeft('swipe-movement-mv-1');
    await fireEvent.press(screen.getByTestId('swipe-movement-mv-1-delete'));
    const buttons = spy.mock.calls.at(-1)![2] as { text?: string; onPress?: () => void }[];
    buttons.find((b) => b.text === 'Delete')!.onPress!();
    await waitFor(() => expect(total().getByText('AED 5,000.00')).toBeTruthy());
    spy.mockRestore();
  });
});

describe('the savings questions', () => {
  it('the existing balance and the target can be changed, and zero is accepted', async () => {
    const { getPathname } = await openApp('/savings', { seed: userWith() });
    await fireEvent.press(screen.getByTestId('edit-target'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-target/new'));
    await fireEvent.changeText(screen.getByTestId('input-target'), '0');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(within(screen.getByTestId('target-card')).getByText('AED 0.00')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('edit-opening'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-opening/new'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '0');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(total().getByText('AED 0.00')).toBeTruthy();
  });
});
