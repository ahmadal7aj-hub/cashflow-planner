import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import Dashboard from '../app/(tabs)/dashboard';
import Income from '../app/(tabs)/income';
import Insights from '../app/(tabs)/insights';
import Savings from '../app/(tabs)/savings';
import Spending from '../app/(tabs)/spending';
import Commitments from '../app/commitments';
import EditItem from '../app/edit/[kind]/[id]';
import Explain from '../app/explain/[metric]';
import Index from '../app/index';
import Onboarding from '../app/onboarding';
import Scenario from '../app/scenario';
import Settings from '../app/settings';
import Warning from '../app/warning/[id]';

const routes = {
  _layout: RootLayout,
  index: Index,
  onboarding: Onboarding,
  commitments: Commitments,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/dashboard': Dashboard,
  '(tabs)/income': Income,
  '(tabs)/insights': Insights,
  '(tabs)/savings': Savings,
  '(tabs)/spending': Spending,
  scenario: Scenario,
  settings: Settings,
  'warning/[id]': Warning,
  'explain/[metric]': Explain,
  'edit/[kind]/[id]': EditItem,
};

/** RNTL v14 renders asynchronously and expo-router attaches getPathname to the returned promise. */
async function openApp(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

/** Today is pinned so date maths in the tests is deterministic. */
beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00') });
});
afterAll(() => {
  jest.useRealTimers();
});

/** Open a date field and tap a day in its calendar. */
async function pickDate(toggleTestId: string, iso: string) {
  await fireEvent.press(screen.getByTestId(toggleTestId));
  await fireEvent.press(screen.getByTestId(`date-day-${iso}`));
}

describe('Income dashboard (P1-01)', () => {
  it('is reachable from the tab bar', async () => {
    const { getPathname } = await openApp('/dashboard');
    await fireEvent.press(screen.getByTestId('tab-income'));
    await waitFor(() => expect(getPathname()).toBe('/income'));
    expect(screen.getByTestId('income-screen')).toBeTruthy();
  });

  it('shows the headline income numbers', async () => {
    await openApp('/income');

    expect(screen.getByLabelText(/Income each month: AED 17,750.00/)).toBeTruthy();
    expect(
      screen.getByLabelText(/Predictable income: AED 15,000.00. 85% of your income/),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Covers your spending: 102%/)).toBeTruthy();
  });

  it('breaks income down by source with monthly values and shares', async () => {
    await openApp('/income');

    expect(screen.getByLabelText('Monthly salary: AED 15,000.00, 85%')).toBeTruthy();
    expect(screen.getByLabelText('Side work: AED 1,500.00, 8%')).toBeTruthy();
    expect(screen.getByLabelText('Annual bonus: AED 1,250.00, 7%')).toBeTruthy(); // 15,000 a year
  });

  it('labels each source as predictable or varying in words', async () => {
    await openApp('/income');

    expect(
      screen.getByLabelText('Monthly salary, AED 15,000.00, Monthly, Predictable'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Side work, AED 1,500.00, Monthly, Varies')).toBeTruthy();
  });

  it('lists money coming in over the next 60 days', async () => {
    await openApp('/income');

    expect(screen.getByLabelText('Monthly salary (in 12 days): AED 15,000.00')).toBeTruthy();
    expect(screen.getByLabelText('Side work (in 20 days): AED 1,500.00')).toBeTruthy();
    expect(screen.getByLabelText('Monthly salary (in 42 days): AED 15,000.00')).toBeTruthy();
    expect(screen.getByLabelText('Side work (in 50 days): AED 1,500.00')).toBeTruthy();
  });

  it('explains how steady income is, without blame', async () => {
    await openApp('/income');

    expect(
      screen.getByText(
        'Your predictable income covers 102% of your average spending. After savings, about AED 858.33 a month comes from irregular income. That is common; a little extra buffer helps in months it comes in lower.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Your income ranged from AED 16,800.00 to AED 19,000.00, averaging AED 17,575.00.',
      ),
    ).toBeTruthy();
  });

  it('shows income and what was left after spending as trends with text summaries', async () => {
    await openApp('/income');

    expect(
      screen.getByLabelText(
        'Income each cycle over the last six cycles, from AED 17,000.00 to AED 17,750.00.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Money left after spending each cycle over the last six cycles, from AED 3,100.00 to AED 3,150.00.',
      ),
    ).toBeTruthy();
  });

  it('updates when an income source is edited', async () => {
    const { getPathname } = await openApp('/income');

    await fireEvent.press(screen.getByTestId('income-source-side'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/side'));
    await pickDate('next-date-toggle', '2026-10-08');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));

    expect(screen.getByLabelText('Side work (in 5 days): AED 1,500.00')).toBeTruthy();
  });

  it('keeps one-off income visible and editable on the Income tab', async () => {
    const { getPathname } = await openApp('/income');

    await fireEvent.press(screen.getByTestId('add-income-source'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/new'));
    await fireEvent.press(screen.getByTestId('category-other'));
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Eid gift');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '2000');
    await pickDate('next-date-toggle', '2026-10-08');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));

    expect(screen.getByLabelText('Eid gift, AED 2,000.00, One-off, Varies')).toBeTruthy();
    expect(screen.getByLabelText('Eid gift (in 5 days): AED 2,000.00')).toBeTruthy();
  });
  it('adding predictable income changes the steadiness message', async () => {
    const { getPathname } = await openApp('/income');

    await fireEvent.press(screen.getByTestId('add-income-source'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/new'));
    await fireEvent.press(screen.getByTestId('category-allowance'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '2000');
    await pickDate('next-date-toggle', '2026-10-13');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/income'));

    // Predictable income is now 17,000: 17,000 - 14,658.33 - 1,200 = 1,141.67 to spare.
    expect(
      screen.getByText(
        'Your predictable income covers your average spending and savings, with about AED 1,141.67 a month to spare.',
      ),
    ).toBeTruthy();
  });
});

describe('Insights tab (P1-01)', () => {
  it('is reachable from the tab bar and lists the sample insights in order', async () => {
    const { getPathname } = await openApp('/dashboard');
    await fireEvent.press(screen.getByTestId('tab-insights'));
    await waitFor(() => expect(getPathname()).toBe('/insights'));

    for (const id of [
      'over-entertainment',
      'bill-school',
      'ahead-delivery',
      'goal-travel',
      'income-gap',
    ]) {
      expect(screen.getByTestId(`insight-${id}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('insights-empty')).toBeNull();
  });

  it('uses neutral wording with a symbol and a written severity', async () => {
    await openApp('/insights');

    expect(
      screen.getByLabelText(
        '⚠ Needs attention. Entertainment is over budget. You are AED 25.00 past the budget you set. You could move money from another budget or raise this one.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        '▲ Heads-up. School fees (term) is coming up. Due in 40 days. Setting aside AED 4,500.00 a month from now would have it covered.',
      ),
    ).toBeTruthy();
  });

  it('opens the screen that holds the numbers behind an insight', async () => {
    const { getPathname } = await openApp('/insights');

    await fireEvent.press(screen.getByTestId('insight-over-entertainment'));
    await waitFor(() => expect(getPathname()).toBe('/spending'));
  });

  it('an insight disappears once the cause is fixed', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('expense-entertainment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/variable/entertainment'));
    await fireEvent.changeText(screen.getByTestId('input-spent'), '100');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    await fireEvent.press(screen.getByTestId('tab-insights'));
    await waitFor(() => expect(getPathname()).toBe('/insights'));

    expect(screen.queryByTestId('insight-over-entertainment')).toBeNull();
    expect(screen.getByTestId('insight-bill-school')).toBeTruthy();
  });

  it('puts a shortfall at the top when the balance is low', async () => {
    const { getPathname } = await openApp('/onboarding');

    await fireEvent.changeText(screen.getByTestId('input-balance'), '2000');
    await fireEvent.press(screen.getByTestId('onboarding-continue'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    await fireEvent.press(screen.getByTestId('tab-insights'));
    await waitFor(() => expect(getPathname()).toBe('/insights'));

    expect(screen.getByTestId('insight-shortfall')).toBeTruthy();
    expect(screen.getByText('This plan is short before payday')).toBeTruthy();
  });
});
