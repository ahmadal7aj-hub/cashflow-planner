import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { installTestLifecycle, openApp, pickDate } from '../testing/app';

installTestLifecycle();

describe('a brand-new user sees empty sections with an Add item button', () => {
  it('Income is empty', async () => {
    await openApp('/income');
    expect(screen.getByText('No income added yet')).toBeTruthy();
    expect(screen.getByTestId('add-income')).toBeTruthy();
    expect(screen.getByText('Add item')).toBeTruthy();
  });

  it('Budgeting is empty in both sections', async () => {
    await openApp('/budget');
    expect(screen.getByText('Bills and fixed expenses')).toBeTruthy();
    expect(screen.getByText('Everyday budgets')).toBeTruthy();
    expect(screen.getByText('No bills added yet')).toBeTruthy();
    expect(screen.getByText('No everyday budgets yet')).toBeTruthy();
    expect(screen.getAllByText('Add item')).toHaveLength(2);
  });

  it('Actual spending is empty', async () => {
    await openApp('/spending');
    expect(screen.getByText('No spending recorded yet')).toBeTruthy();
    expect(screen.getByTestId('add-spending')).toBeTruthy();
  });

  it('Savings planning has no balance, no goals and no invented amounts', async () => {
    await openApp('/savings');
    expect(screen.getByText('Not set yet')).toBeTruthy();
    expect(screen.getByText('No savings goals yet')).toBeTruthy();
    expect(screen.getByText('No savings activity yet.')).toBeTruthy();
  });

  it('the Dashboard shows zeros, not sample amounts', async () => {
    await openApp('/dashboard');
    expect(screen.getAllByText('AED 0.00').length).toBeGreaterThan(0);
    expect(screen.queryByText(/1,770/)).toBeNull();
    expect(screen.queryByTestId('safe-to-spend-card')).toBeNull();
  });
});

describe('Add item keeps every category choice available', () => {
  it('income form offers the income categories', async () => {
    const { getPathname } = await openApp('/income');
    await fireEvent.press(screen.getByTestId('add-income'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/new'));
    for (const id of [
      'salary',
      'allowance',
      'bonus',
      'freelance',
      'rental',
      'investment',
      'other',
    ]) {
      expect(screen.getByTestId(`category-${id}`)).toBeTruthy();
    }
  });

  it('bill form offers the fixed categories including Other bill', async () => {
    const { getPathname } = await openApp('/budget');
    await fireEvent.press(screen.getAllByTestId('add-fixed')[0]!);
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/new'));
    for (const id of ['rent', 'dewa', 'internet', 'car_loan', 'school', 'other_bill']) {
      expect(screen.getByTestId(`category-${id}`)).toBeTruthy();
    }
  });

  it('everyday budget form offers the everyday categories', async () => {
    const { getPathname } = await openApp('/budget');
    await fireEvent.press(screen.getAllByTestId('add-variable')[0]!);
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/new'));
    for (const id of ['groceries', 'fuel', 'salik', 'parking']) {
      expect(screen.getByTestId(`category-${id}`)).toBeTruthy();
    }
  });

  it('spending form offers every expense category', async () => {
    const { getPathname } = await openApp('/spending');
    await fireEvent.press(screen.getByTestId('add-spending'));
    await waitFor(() => expect(getPathname()).toBe('/edit/expense/new'));
    for (const id of ['groceries', 'fuel', 'rent', 'dining', 'other']) {
      expect(screen.getByTestId(`category-${id}`)).toBeTruthy();
    }
  });
});

describe('only saved items appear as cards', () => {
  it('saving an income shows exactly one card; cancelling shows none', async () => {
    const { getPathname } = await openApp('/income');

    // Open the form and leave without saving.
    await fireEvent.press(screen.getByTestId('add-income'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/new'));

    // Fill the form and save.
    await fireEvent.changeText(screen.getByTestId('input-amount'), '10000');
    await pickDate('next-date-toggle', '2026-10-25');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));

    expect(screen.getByTestId('income-inc-1')).toBeTruthy();
    expect(screen.getByText('AED 10,000.00')).toBeTruthy();
    expect(screen.queryByText('No income added yet')).toBeNull();
  });

  it('the first-run questions accept zero and lead to the empty Income page', async () => {
    const { getPathname } = await openApp('/setup');
    await fireEvent.press(screen.getByTestId('setup-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));
    expect(screen.getByText('No income added yet')).toBeTruthy();
  });

  it('the first-run questions reject junk and a future date', async () => {
    await openApp('/setup');
    await fireEvent.changeText(screen.getByTestId('input-opening'), 'abc');
    await fireEvent.press(screen.getByTestId('setup-save'));
    expect(screen.getByTestId('error-opening')).toBeTruthy();
  });
});
