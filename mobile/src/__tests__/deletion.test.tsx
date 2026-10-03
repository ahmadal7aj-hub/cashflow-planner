import { Alert } from 'react-native';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { addTransaction } from '../domain/planOps';
import { demoPlan } from '../domain/sampleData';
import {
  aed,
  everyday,
  installTestLifecycle,
  openApp,
  salary,
  swipeLeft,
  TODAY,
  userWith,
} from '../testing/app';

installTestLifecycle();

type AlertButton = { text?: string; style?: string; onPress?: () => void };

/** Captures the confirmation dialog and lets the test press one of its buttons. */
function spyOnConfirm() {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  return {
    spy,
    press(text: string) {
      const buttons = spy.mock.calls.at(-1)![2] as AlertButton[];
      buttons.find((b) => b.text === text)!.onPress?.();
    },
    title: () => spy.mock.calls.at(-1)![0],
    buttons: () => (spy.mock.calls.at(-1)![2] as AlertButton[]).map((b) => b.text),
  };
}

afterEach(() => jest.restoreAllMocks());

describe('delete inside the item, with confirmation and Cancel', () => {
  it('asks first, Cancel keeps the item, a second tap deletes it', async () => {
    const plan = userWith({ income: [salary()] });
    const { getPathname } = await openApp('/income', { seed: plan });

    await fireEvent.press(screen.getByTestId('income-salary'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/salary'));

    await fireEvent.press(screen.getByTestId('edit-delete'));
    expect(screen.getByTestId('delete-confirm-note')).toBeTruthy();
    expect(getPathname()).toBe('/edit/income/salary'); // nothing deleted yet

    await fireEvent.press(screen.getByTestId('edit-delete-cancel'));
    expect(screen.queryByTestId('delete-confirm-note')).toBeNull();

    await fireEvent.press(screen.getByTestId('edit-delete'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/income'));
    expect(screen.queryByTestId('income-salary')).toBeNull();
    expect(screen.getByText('No income added yet')).toBeTruthy();
  });

  it('works for bills, everyday budgets and goals too', async () => {
    const plan = userWith({ expenses: [everyday('groc', 'groceries', 'Groceries', 3000)] });
    const { getPathname } = await openApp('/budget', { seed: plan });
    await fireEvent.press(screen.getByTestId('expense-groc'));
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/groc'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/budget'));
    expect(screen.queryByTestId('expense-groc')).toBeNull();
  });
});

describe('swipe left to reveal a red Delete button, then confirm', () => {
  it('shows the confirmation with Cancel; Cancel keeps the item', async () => {
    const plan = userWith({ income: [salary()] });
    await openApp('/income', { seed: plan });
    const confirm = spyOnConfirm();

    await swipeLeft('swipe-income-salary');
    await fireEvent.press(screen.getByTestId('swipe-income-salary-delete'));

    expect(confirm.title()).toBe('Delete Salary?');
    expect(confirm.buttons()).toEqual(['Cancel', 'Delete']);
    confirm.press('Cancel');
    expect(screen.getByTestId('income-salary')).toBeTruthy();
  });

  it('Delete in the confirmation removes the item and recalculates totals', async () => {
    const plan = userWith({ income: [salary()] });
    const { getPathname } = await openApp('/dashboard', { seed: plan });
    expect(
      within(screen.getByTestId('income-summary')).getByLabelText('Still expected: AED 10,000.00'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tab-income'));
    await waitFor(() => expect(getPathname()).toBe('/income'));
    const confirm = spyOnConfirm();
    await swipeLeft('swipe-income-salary');
    await fireEvent.press(screen.getByTestId('swipe-income-salary-delete'));
    confirm.press('Delete');

    await waitFor(() => expect(screen.queryByTestId('income-salary')).toBeNull());
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(
      within(screen.getByTestId('income-summary')).getByLabelText('Received: AED 0.00'),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('income-summary')).queryByLabelText(/Still expected/),
    ).toBeNull();
  });

  it('a short or mostly vertical drag does not reveal Delete or delete anything', async () => {
    const plan = userWith({ income: [salary()] });
    await openApp('/income', { seed: plan });
    const confirm = spyOnConfirm();
    await swipeLeft('swipe-income-salary', 5);
    expect(confirm.spy).not.toHaveBeenCalled();
    expect(screen.getByTestId('income-salary')).toBeTruthy();
  });

  it('screen-reader users can delete with the delete action, also with confirmation', async () => {
    const plan = userWith({ income: [salary()] });
    await openApp('/income', { seed: plan });
    const confirm = spyOnConfirm();
    await fireEvent(screen.getByTestId('swipe-income-salary'), 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });
    expect(confirm.title()).toBe('Delete Salary?');
    expect(screen.getByTestId('income-salary')).toBeTruthy();
  });
});

describe('deleting a budget never deletes past spending', () => {
  it('keeps last month spending and its budget; this month shows the spending as unbudgeted', async () => {
    const withTx = addTransaction(
      userWith({ expenses: [everyday('groc', 'groceries', 'Groceries', 3000)] }),
      { date: '2026-09-20', categoryId: 'groceries', amount: aed(800), note: 'Weekly shop' },
      '2026-10-15',
    );
    const withOct = addTransaction(
      withTx,
      { date: '2026-10-03', categoryId: 'groceries', amount: aed(250), note: '' },
      '2026-10-15',
    );
    const { getPathname } = await openApp('/budget', { seed: withOct });

    const confirm = spyOnConfirm();
    await swipeLeft('swipe-expense-groc');
    await fireEvent.press(screen.getByTestId('swipe-expense-groc-delete'));
    confirm.press('Delete');
    await waitFor(() => expect(screen.queryByTestId('expense-groc')).toBeNull());

    await fireEvent.press(screen.getByTestId('tab-spending'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));
    // This month: the 250 spent is still there, now labelled unbudgeted.
    expect(screen.getByTestId('cat-status-groceries').props.children).toBe(
      'Unbudgeted: no budget set for this category',
    );
    expect(
      within(screen.getByTestId('cat-groceries')).getByLabelText('Spent: AED 250.00'),
    ).toBeTruthy();
    // Last month: the budget of 3,000 and the 800 spent are intact.
    await fireEvent.press(screen.getByTestId('month-prev'));
    const sept = within(screen.getByTestId('cat-groceries'));
    expect(sept.getByLabelText('Budget: AED 3,000.00')).toBeTruthy();
    expect(sept.getByLabelText('Spent: AED 800.00')).toBeTruthy();
  });

  it('deleting a spending record updates the totals', async () => {
    const plan = addTransaction(
      userWith({ expenses: [everyday('groc', 'groceries', 'Groceries', 3000)] }),
      { date: '2026-10-03', categoryId: 'groceries', amount: aed(500), note: '' },
      '2026-10-15',
    );
    await openApp('/spending', { seed: plan });
    expect(
      within(screen.getByTestId('cat-groceries')).getByLabelText('Remaining: AED 2,500.00'),
    ).toBeTruthy();

    const confirm = spyOnConfirm();
    await swipeLeft('swipe-spend-tx-1');
    await fireEvent.press(screen.getByTestId('swipe-spend-tx-1-delete'));
    confirm.press('Delete');
    await waitFor(() =>
      expect(
        within(screen.getByTestId('cat-groceries')).getByLabelText('Remaining: AED 3,000.00'),
      ).toBeTruthy(),
    );
  });
});

describe('swipe delete works on goals and investments too', () => {
  it('a savings goal and an investment can be swiped away, with confirmation', async () => {
    const { getPathname } = await openApp('/savings', { seed: demoPlan(TODAY) });
    const confirm = spyOnConfirm();

    await swipeLeft('swipe-goal-gold');
    await fireEvent.press(screen.getByTestId('swipe-goal-gold-delete'));
    expect(confirm.title()).toBe('Delete Gold savings?');
    confirm.press('Delete');
    await waitFor(() => expect(screen.queryByTestId('goal-gold')).toBeNull());

    await fireEvent.press(screen.getByTestId('open-investments'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));
    await swipeLeft('swipe-investment-etf');
    await fireEvent.press(screen.getByTestId('swipe-investment-etf-delete'));
    confirm.press('Cancel');
    expect(screen.getByTestId('investment-etf')).toBeTruthy();
    await swipeLeft('swipe-investment-etf');
    await fireEvent.press(screen.getByTestId('swipe-investment-etf-delete'));
    confirm.press('Delete');
    await waitFor(() => expect(screen.queryByTestId('investment-etf')).toBeNull());
  });
});
