import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { demoPlan } from '../domain/sampleData';
import { installTestLifecycle, openApp as openWith, TODAY } from '../testing/app';

installTestLifecycle();

/** The investments screens are tested with the demo investments (a Global index fund, gold and a property fund). */
const openApp = (url: string) => openWith(url, { seed: demoPlan(TODAY) });

describe('Investments (summary card on the Savings tab)', () => {
  it('summarises what is held and links to the full screen', async () => {
    const { getPathname } = await openApp('/savings');

    expect(screen.getByTestId('investments-card')).toBeTruthy();
    expect(screen.getByLabelText('Worth now: AED 47,100.00')).toBeTruthy();
    expect(screen.getByLabelText('Profit: +AED 4,100.00')).toBeTruthy();
    expect(screen.getByLabelText('Income each month: AED 80.00')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('open-investments'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));
  });
});

describe('Investments screen', () => {
  it('says plainly that it is for tracking, not advice', async () => {
    await openApp('/investments');
    expect(screen.getByText(/not investment advice, and returns are not guaranteed/)).toBeTruthy();
  });

  it('shows the headline numbers, hand-checked', async () => {
    await openApp('/investments');

    expect(screen.getByLabelText('Total invested: AED 43,000.00. 3 investments')).toBeTruthy();
    expect(screen.getByLabelText('Worth now: AED 47,100.00')).toBeTruthy();
    expect(screen.getByLabelText('Profit: +AED 4,100.00. +9.5%')).toBeTruthy();
    expect(
      screen.getByLabelText('Income each month: AED 80.00. About 2.0% a year on what it is worth'),
    ).toBeTruthy();
  });

  it('splits what you hold by type with shares', async () => {
    await openApp('/investments');

    expect(screen.getByLabelText('Funds and ETFs: AED 22,400.00, 48%')).toBeTruthy();
    expect(screen.getByLabelText('Real estate: AED 15,600.00, 33%')).toBeTruthy();
    expect(screen.getByLabelText('Gold and metals: AED 9,100.00, 19%')).toBeTruthy();
  });

  it('lists each investment with its profit written out and its income', async () => {
    await openApp('/investments');

    expect(
      screen.getByLabelText(
        'Global index fund, worth AED 22,400.00. Profit +AED 2,400.00 (+12.0%). No income entered',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Dubai property fund, worth AED 15,600.00. Profit +AED 600.00 (+4.0%). Income about AED 80.00 a month',
      ),
    ).toBeTruthy();
  });
});

describe('adding, editing and deleting an investment', () => {
  it('adds an investment with a loss, and shows it as a loss', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('add-investment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/new'));
    await fireEvent.press(screen.getByTestId('type-stocks'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Emirates stocks');
    await fireEvent.changeText(screen.getByTestId('input-invested'), '10000');
    await fireEvent.changeText(screen.getByTestId('input-value'), '9500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));

    expect(
      screen.getByLabelText(
        'Emirates stocks, worth AED 9,500.00. Loss -AED 500.00 (-5.0%). No income entered',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Total invested: AED 53,000.00. 4 investments')).toBeTruthy();
    expect(screen.getByLabelText('Profit: +AED 3,600.00. +6.8%')).toBeTruthy(); // 4,100 - 500
  });

  it('labels the income field by type, and an Other investment starts with no name', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('add-investment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/new'));
    expect(screen.getByText('Dividends received (AED)')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('type-real-estate'));
    expect(screen.getByText('Rent or dividends received (AED)')).toBeTruthy();
    expect(screen.getByTestId('input-name').props.value).toBe('Real estate');

    await fireEvent.press(screen.getByTestId('type-other'));
    expect(screen.getByTestId('input-name').props.value).toBe('');
  });

  it('income entered on an investment is counted in monthly income', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('add-investment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/new'));
    await fireEvent.press(screen.getByTestId('type-stocks'));
    await fireEvent.changeText(screen.getByTestId('input-invested'), '10000');
    await fireEvent.changeText(screen.getByTestId('input-value'), '10000');
    await fireEvent.changeText(screen.getByTestId('input-income'), '1200');
    await fireEvent.press(screen.getByTestId('income-frequency-annual'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));

    // 1,200 a year = 100 a month on top of the property fund's 80.
    expect(screen.getByLabelText(/^Income each month: AED 180.00/)).toBeTruthy();
  });

  it('a planned monthly contribution is set aside, lowering safe-to-spend by that amount', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('investment-etf'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/etf'));
    await fireEvent.changeText(screen.getByTestId('input-contribution'), '500');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));
    expect(screen.getByText('Adding AED 500.00 a month')).toBeTruthy();

    await act(async () => {
      router.navigate('/dashboard');
    });
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.getByText('AED 1,270.00')).toBeTruthy(); // 1,770 - 500
  });

  it('a paused contribution is not set aside', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('investment-etf'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/etf'));
    await fireEvent.changeText(screen.getByTestId('input-contribution'), '500');
    await fireEvent.press(screen.getByTestId('enabled-no'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));
    expect(screen.getByText('Monthly contribution paused')).toBeTruthy();

    await act(async () => {
      router.navigate('/dashboard');
    });
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.getByText('AED 1,770.00')).toBeTruthy();
  });

  it('the profit tile turns into a loss tile when the total is below what was put in', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('investment-etf'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/etf'));
    await fireEvent.changeText(screen.getByTestId('input-value'), '10000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));

    // 4,100 - 12,400 = -8,300, which is -19.3% of 43,000.
    expect(screen.getByLabelText('Loss: -AED 8,300.00. -19.3%')).toBeTruthy();
    expect(screen.queryByLabelText(/^Profit: /)).toBeNull();
  });

  it('requires a name and a positive amount invested', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('add-investment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/new'));
    await fireEvent.changeText(screen.getByTestId('input-name'), '');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-name')).toBeTruthy();
    expect(screen.getByTestId('error-invested')).toBeTruthy();
    expect(getPathname()).toBe('/edit/investment/new');
  });

  it('rejects text where a number is needed', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('add-investment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/new'));
    await fireEvent.changeText(screen.getByTestId('input-invested'), '1000');
    await fireEvent.changeText(screen.getByTestId('input-value'), 'a lot');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-value')).toBeTruthy();
    expect(getPathname()).toBe('/edit/investment/new');
  });

  it('deletes an investment', async () => {
    const { getPathname } = await openApp('/investments');

    await fireEvent.press(screen.getByTestId('investment-gold'));
    await waitFor(() => expect(getPathname()).toBe('/edit/investment/gold'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/investments'));

    expect(screen.queryByTestId('investment-gold')).toBeNull();
    expect(screen.getByLabelText('Total invested: AED 35,000.00. 2 investments')).toBeTruthy();
  });

  it('shows a friendly empty state when everything is deleted, with no chart', async () => {
    const { getPathname } = await openApp('/investments');

    for (const id of ['etf', 'gold', 'reit']) {
      await fireEvent.press(screen.getByTestId(`investment-${id}`));
      await waitFor(() => expect(getPathname()).toBe(`/edit/investment/${id}`));
      await fireEvent.press(screen.getByTestId('edit-delete'));
      await fireEvent.press(screen.getByTestId('edit-delete'));
      await waitFor(() => expect(getPathname()).toBe('/investments'));
    }

    expect(screen.getByText(/No investments yet/)).toBeTruthy();
    expect(screen.queryByTestId('allocation-chart')).toBeNull();
    expect(screen.getByLabelText('Total invested: AED 0.00. 0 investments')).toBeTruthy();
  });

  it('shows a message for an investment that does not exist', async () => {
    await openApp('/edit/investment/nope');
    expect(screen.getByText('This item no longer exists.')).toBeTruthy();
  });
});
