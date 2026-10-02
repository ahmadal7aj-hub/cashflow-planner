import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

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

/** Today is pinned so dates in the tests are deterministic. */
beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00') });
});
afterAll(() => {
  jest.useRealTimers();
});

describe('Savings dashboard (P1-01)', () => {
  it('is reachable from the tab bar', async () => {
    const { getPathname } = await openApp('/dashboard');
    await fireEvent.press(screen.getByTestId('tab-savings'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    expect(screen.getByTestId('savings-screen')).toBeTruthy();
  });

  it('shows the headline savings numbers', async () => {
    await openApp('/savings');

    expect(
      screen.getByLabelText(/Saved each month: AED 1,200.00. 6.8% of your income/),
    ).toBeTruthy();
    expect(screen.getByTestId('current-savings-card')).toBeTruthy();
    expect(screen.getByText('AED 23,600.00')).toBeTruthy();
    expect(
      screen.getByLabelText(/Emergency cover: 1.4 months. Building toward 3 months/),
    ).toBeTruthy();
  });

  it('explains the emergency fund in months of essential spending', async () => {
    await openApp('/savings');
    expect(
      screen.getByText(
        'Your essential spending is about AED 12,808.33 a month. Many people aim for 3 to 6 months. Three months is AED 38,424.99, and you are AED 20,424.99 away.',
      ),
    ).toBeTruthy();
  });

  it('shows every goal with a written status', async () => {
    await openApp('/savings');

    expect(
      screen.getByLabelText(
        'Emergency fund. AED 18,000.00 of AED 45,000.00 · 40%. About 54 months at AED 500.00 a month',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Summer travel. AED 2,400.00 of AED 8,000.00 · 30%. ▲ Needs AED 1,120.00 a month to finish on time',
      ),
    ).toBeTruthy();
  });

  it('plans big bills: how much to set aside each month to be ready', async () => {
    await openApp('/savings');

    expect(screen.getByText('Due in 40 days · set aside AED 4,500.00 a month')).toBeTruthy();
    expect(screen.getByText('Due in 95 days · set aside AED 700.00 a month')).toBeTruthy();
    expect(screen.getByText('Due in 200 days · set aside AED 214.29 a month')).toBeTruthy();
  });

  it('shows what is left unallocated each month', async () => {
    await openApp('/savings');
    expect(
      screen.getByText(
        'After your average spending and your savings, about AED 1,891.67 a month is unallocated.',
      ),
    ).toBeTruthy();
  });

  it('shows a clearly labelled gratuity estimate', async () => {
    await openApp('/savings');

    expect(screen.getByText('AED 25,200.00')).toBeTruthy();
    expect(
      screen.getByText('Based on 4 years of service and a basic wage of AED 9,000.00 a month.'),
    ).toBeTruthy();
    expect(screen.getByText(/An illustration only/)).toBeTruthy();
    expect(screen.getByText(/confirm with your employer or the labour authority/)).toBeTruthy();
  });

  it('recomputes the gratuity when service details change', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('edit-employment'));
    await waitFor(() => expect(getPathname()).toBe('/edit/employment/me'));
    await fireEvent.changeText(screen.getByTestId('input-years'), '7');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByText('AED 49,500.00')).toBeTruthy(); // 5 x 21 + 2 x 30 = 165 days x 300
  });

  it('rejects invalid service details', async () => {
    await openApp('/edit/employment/me');

    await fireEvent.changeText(screen.getByTestId('input-years'), 'abc');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-years')).toBeTruthy();
  });

  it('pausing a goal lowers the monthly savings figure', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('goal-gold'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/gold'));
    await fireEvent.press(screen.getByTestId('enabled-no'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByLabelText(/Saved each month: AED 900.00/)).toBeTruthy();
  });

  it('moving the emergency-fund flag to another goal changes the cover', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('goal-gold'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/gold'));
    await fireEvent.press(screen.getByTestId('emergency-yes'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    // Gold has 3,200 saved: 3,200 / 12,808.33 = 0.2 months, and the old emergency flag was cleared.
    expect(screen.getByLabelText(/Emergency cover: 0.2 months. Under 1 month/)).toBeTruthy();
  });

  it('adds a new goal', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('add-goal'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/new'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Hajj fund');
    await fireEvent.changeText(screen.getByTestId('input-target'), '30000');
    await fireEvent.changeText(screen.getByTestId('input-monthly'), '1000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByTestId('goal-goal-4')).toBeTruthy();
    expect(screen.getByLabelText(/Saved each month: AED 2,200.00/)).toBeTruthy();
  });

  it('shows the saving trend with a text summary', async () => {
    await openApp('/savings');
    expect(
      screen.getByLabelText(
        'Amount saved each cycle over the last six cycles, from AED 1,500.00 to AED 1,200.00.',
      ),
    ).toBeTruthy();
  });
});

describe('Current savings balance', () => {
  async function go(getPathname: () => string, testId: string, path: string) {
    await fireEvent.press(screen.getByTestId(testId));
    await waitFor(() => expect(getPathname()).toBe(path));
  }

  it('shows the current balance, starting at what the goals have set aside', async () => {
    await openApp('/savings');
    expect(screen.getByText('AED 23,600.00')).toBeTruthy();
    expect(screen.getByText(/It goes up when you add money or save/)).toBeTruthy();
    expect(screen.getByText(/No activity yet/)).toBeTruthy();
  });

  it('goes up when money is added, and records it with a note', async () => {
    const { getPathname } = await openApp('/savings');

    await go(getPathname, 'savings-add', '/edit/savings-in/new');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '500');
    await fireEvent.changeText(screen.getByTestId('input-note'), 'Bonus');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByText('AED 24,100.00')).toBeTruthy();
    expect(screen.getByLabelText('3 Oct 2026 · Added · Bonus: +AED 500.00')).toBeTruthy();
  });

  it('goes down when money is taken out', async () => {
    const { getPathname } = await openApp('/savings');

    await go(getPathname, 'savings-take', '/edit/savings-out/new');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '600');
    await fireEvent.changeText(screen.getByTestId('input-note'), 'Car repair');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(screen.getByText('AED 23,000.00')).toBeTruthy();
    expect(screen.getByLabelText('3 Oct 2026 · Taken out · Car repair: -AED 600.00')).toBeTruthy();
  });

  it('will not let you take out more than you have saved', async () => {
    const { getPathname } = await openApp('/savings');

    await go(getPathname, 'savings-take', '/edit/savings-out/new');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '30000');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByText('You only have AED 23,600.00 saved.')).toBeTruthy();
    expect(getPathname()).toBe('/edit/savings-out/new');
  });

  it('rejects an empty or invalid amount', async () => {
    const { getPathname } = await openApp('/savings');

    await go(getPathname, 'savings-add', '/edit/savings-in/new');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-amount')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-amount'), '-50');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-amount')).toBeTruthy();
    expect(getPathname()).toBe('/edit/savings-in/new');
  });

  it('shows the end-of-cycle estimate and adds it only when asked, and only once', async () => {
    await openApp('/savings');

    expect(
      screen.getByText('A typical month: AED 17,750.00 comes in and AED 14,658.33 goes out.'),
    ).toBeTruthy();
    expect(
      screen.getByText('That leaves about AED 3,091.67. Apply it to add it to your savings.'),
    ).toBeTruthy();
    expect(screen.getByText('AED 23,600.00')).toBeTruthy(); // nothing applied yet

    await fireEvent.press(screen.getByTestId('close-cycle'));

    expect(screen.getByText('AED 26,691.67')).toBeTruthy(); // 23,600 + 3,091.67
    expect(screen.getByLabelText('3 Oct 2026 · Pay cycle: +AED 3,091.67')).toBeTruthy();
    expect(screen.queryByTestId('close-cycle')).toBeNull();
    expect(screen.getByTestId('cycle-done')).toBeTruthy();
  });

  it('reduces savings when more went out than came in', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('add-fixed'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/new'));
    await fireEvent.press(screen.getByTestId('category-other_bill'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Villa works');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '5000');
    await fireEvent.press(screen.getByTestId('due-date-toggle'));
    await fireEvent.press(screen.getByTestId('date-day-2026-10-28'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await act(async () => {
      router.navigate('/savings');
    });
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    expect(
      screen.getByText(
        'That is about AED 1,908.33 more going out than coming in. Applying it reduces your savings.',
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId('close-cycle'));
    expect(screen.getByText('AED 21,691.67')).toBeTruthy(); // 23,600 - 1,908.33
    expect(screen.getByLabelText('3 Oct 2026 · Pay cycle: -AED 1,908.33')).toBeTruthy();
    expect(screen.queryByTestId('below-zero-note')).toBeNull();
  });

  it('points out when savings have gone below zero', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('add-fixed'));
    await waitFor(() => expect(getPathname()).toBe('/edit/fixed/new'));
    await fireEvent.press(screen.getByTestId('category-other_bill'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Huge bill');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '60000');
    await fireEvent.press(screen.getByTestId('due-date-toggle'));
    await fireEvent.press(screen.getByTestId('date-day-2026-10-28'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));
    await act(async () => {
      router.navigate('/savings');
    });
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    await fireEvent.press(screen.getByTestId('close-cycle'));

    expect(screen.getByText('-AED 33,308.33')).toBeTruthy(); // 23,600 + 3,091.67 - 60,000
    expect(screen.getByTestId('below-zero-note')).toBeTruthy();
  });
});
