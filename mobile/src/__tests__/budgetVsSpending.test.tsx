import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import {
  aed,
  bill,
  everyday,
  installTestLifecycle,
  openApp,
  pickDate,
  salary,
  userWith,
} from '../testing/app';
import { addTransaction } from '../domain/planOps';

installTestLifecycle();

async function addSpendingViaForm(
  getPathname: () => string,
  categoryId: string,
  amount: string,
  date?: string,
) {
  await fireEvent.press(screen.getAllByTestId('add-spending')[0]!);
  await waitFor(() => expect(getPathname()).toBe('/edit/expense/new'));
  await fireEvent.press(screen.getByTestId(`category-${categoryId}`));
  await fireEvent.changeText(screen.getByTestId('input-amount'), amount);
  if (date) await pickDate('spend-date-toggle', date);
  await fireEvent.press(screen.getByTestId('edit-save'));
  await waitFor(() => expect(getPathname()).toBe('/spending'));
}

describe('budget against actual spending, per category', () => {
  it('groceries: budget 3,000, purchases of 500 and 300, spent 800, remaining 2,200', async () => {
    const plan = userWith({ expenses: [everyday('groc', 'groceries', 'Groceries', 3000)] });
    const { getPathname } = await openApp('/spending', { seed: plan });

    await addSpendingViaForm(getPathname, 'groceries', '500');
    await addSpendingViaForm(getPathname, 'groceries', '300');

    const card = within(screen.getByTestId('cat-groceries'));
    expect(card.getByLabelText('Budget: AED 3,000.00')).toBeTruthy();
    expect(card.getByLabelText('Spent: AED 800.00')).toBeTruthy();
    expect(card.getByLabelText('Remaining: AED 2,200.00')).toBeTruthy();
    expect(screen.getByTestId('cat-status-groceries').props.children).toBe('Within budget');
  });

  it('petrol: budget 1,000, four fill-ups of 200, spent 800, remaining 200', async () => {
    const plan = userWith({ expenses: [everyday('fuel', 'fuel', 'Petrol', 1000)] });
    const { getPathname } = await openApp('/spending', { seed: plan });

    for (let i = 0; i < 4; i++) await addSpendingViaForm(getPathname, 'fuel', '200');

    const card = within(screen.getByTestId('cat-fuel'));
    expect(card.getByLabelText('Budget: AED 1,000.00')).toBeTruthy();
    expect(card.getByLabelText('Spent: AED 800.00')).toBeTruthy();
    expect(card.getByLabelText('Remaining: AED 200.00')).toBeTruthy();
    expect(screen.getByTestId('spending-summary')).toBeTruthy();
  });

  it('shows a negative balance clearly as overspending', async () => {
    const plan = addTransaction(
      userWith({ expenses: [everyday('fuel', 'fuel', 'Petrol', 1000)] }),
      { date: '2026-10-05', categoryId: 'fuel', amount: aed(1150), note: '' },
      '2026-10-15',
    );
    await openApp('/spending', { seed: plan });

    const card = within(screen.getByTestId('cat-fuel'));
    expect(card.getByLabelText('Remaining: -AED 150.00')).toBeTruthy();
    expect(screen.getByTestId('cat-status-fuel').props.children).toBe('Over by AED 150.00');
    expect(within(screen.getByTestId('spending-summary')).getByText('Over budget by')).toBeTruthy();
  });

  it('allows unbudgeted spending and labels it instead of hiding it', async () => {
    const plan = userWith();
    const { getPathname } = await openApp('/spending', { seed: plan });
    await addSpendingViaForm(getPathname, 'dining', '120');

    expect(screen.getByTestId('cat-dining')).toBeTruthy();
    expect(screen.getByTestId('cat-status-dining').props.children).toBe(
      'Unbudgeted: no budget set for this category',
    );
  });

  it('spending dated in another month does not count in this month', async () => {
    const plan = addTransaction(
      userWith({ expenses: [everyday('groc', 'groceries', 'Groceries', 3000)] }),
      { date: '2026-09-20', categoryId: 'groceries', amount: aed(400), note: '' },
      '2026-10-15',
    );
    await openApp('/spending', { seed: plan });
    const october = within(screen.getByTestId('cat-groceries'));
    expect(october.getByLabelText('Spent: AED 0.00')).toBeTruthy();
    expect(october.getByLabelText('Remaining: AED 3,000.00')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('month-prev'));
    const september = within(screen.getByTestId('cat-groceries'));
    expect(september.getByLabelText('Spent: AED 400.00')).toBeTruthy();
    expect(september.getByLabelText('Remaining: AED 2,600.00')).toBeTruthy();
  });
});

describe('a planned bill is not spending until it is marked paid, and then counts once', () => {
  it('marks a bill as paid and shows it once in Actual spending', async () => {
    const plan = userWith({ expenses: [bill('rent', 'rent', 'Rent', 5000, '2026-10-20')] });
    const { getPathname } = await openApp('/budget', { seed: plan });

    await fireEvent.press(screen.getByTestId('pay-rent'));
    expect(screen.queryByTestId('pay-rent')).toBeNull(); // cannot be paid twice
    expect(screen.getByTestId('paid-rent')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tab-spending'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));
    const card = within(screen.getByTestId('cat-rent'));
    expect(card.getByLabelText('Budget: AED 5,000.00')).toBeTruthy();
    expect(card.getByLabelText('Spent: AED 5,000.00')).toBeTruthy(); // counted once
    expect(card.getByLabelText('Remaining: AED 0.00')).toBeTruthy();
    expect(screen.getAllByTestId(/^spend-tx-/)).toHaveLength(1);
  });

  it('an unpaid bill adds to the budget but not to spending', async () => {
    const plan = userWith({ expenses: [bill('rent', 'rent', 'Rent', 5000, '2026-10-20')] });
    await openApp('/spending', { seed: plan });
    const card = within(screen.getByTestId('cat-rent'));
    expect(card.getByLabelText('Budget: AED 5,000.00')).toBeTruthy();
    expect(card.getByLabelText('Spent: AED 0.00')).toBeTruthy();
  });
});

describe('income is not mixed into spending', () => {
  it('an income item adds nothing to actual spending', async () => {
    const plan = userWith({ income: [salary()] });
    await openApp('/spending', { seed: plan });
    expect(screen.getByText('No spending recorded yet')).toBeTruthy();
  });
});
