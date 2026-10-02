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

/** Today is pinned so date maths in the tests is deterministic. */
beforeAll(() => {
  jest.useFakeTimers({ now: new Date('2026-10-03T09:00:00') });
});
afterAll(() => {
  jest.useRealTimers();
});

/** RNTL v14 renders asynchronously and expo-router attaches getPathname to the returned promise. */
async function openApp(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

async function openDatePicker(toggleTestId: string) {
  await fireEvent.press(screen.getByTestId(toggleTestId));
}

/** From /commitments, start adding a bill. */
async function startNewBill(getPathname: () => string) {
  await fireEvent.press(screen.getByTestId('add-fixed'));
  await waitFor(() => expect(getPathname()).toBe('/edit/fixed/new'));
}

describe('real dates in the plan', () => {
  it('shows real dates next to every item, not just "in N days"', async () => {
    await openApp('/commitments');

    // The sample rent is due in 4 days, so on 3 Oct 2026 that is 7 Oct 2026.
    expect(
      screen.getByLabelText(/^Rent, AED 3,500.00, Monthly · next 7 Oct 2026 \(in 4 days\)/),
    ).toBeTruthy();
    expect(screen.getByText(/next 15 Oct 2026 \(in 12 days\)/)).toBeTruthy(); // salary
  });

  it('a bill with a real due date inside the plan lowers safe-to-spend by its amount', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.changeText(screen.getByTestId('input-amount'), '100');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-13')); // day 10, before payday on day 12
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.getByText('AED 1,670.00')).toBeTruthy(); // 1,770 - 100
  });

  it('a bill dated after payday does not change safe-to-spend yet', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.changeText(screen.getByTestId('input-amount'), '100');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-28'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.getByText('AED 1,770.00')).toBeTruthy();
  });

  it('asks for a due date and will not save without one', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.changeText(screen.getByTestId('input-amount'), '100');
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByTestId('error-due-date')).toBeTruthy();
    expect(screen.getByText('Please choose a due date.')).toBeTruthy();
    expect(getPathname()).toBe('/edit/fixed/new');
  });

  it('a one-off bill cannot be dated in the past', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await fireEvent.changeText(screen.getByTestId('input-amount'), '100');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-01')); // yesterday-ish: disabled
    await fireEvent.press(screen.getByTestId('edit-save'));

    expect(screen.getByText('Please choose a due date.')).toBeTruthy();
    expect(getPathname()).toBe('/edit/fixed/new');
  });
});

describe('the Other bill category', () => {
  it('lets the user name any bill themselves', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('category-other_bill'));
    expect(screen.getByTestId('input-name').props.value).toBe(''); // no preset name

    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-name')).toBeTruthy(); // a name is required

    await fireEvent.changeText(screen.getByTestId('input-name'), 'Parking permit');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '120');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-20'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    expect(screen.getByText('Parking permit')).toBeTruthy();
    expect(screen.getByText(/Other bill \(name it yourself\)/)).toBeTruthy();
  });
});

describe('reminders', () => {
  it('shows the reminder date a preset gives for the chosen due date', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-next'));
    await fireEvent.press(screen.getByTestId('date-next'));
    await fireEvent.press(screen.getByTestId('date-day-2026-12-15')); // rent due 15 Dec 2026
    await fireEvent.press(screen.getByTestId('reminder-7')); // 1 week before

    expect(screen.getByTestId('reminder-summary').props.children).toBe(
      'You will see a reminder from 8 Dec 2026.',
    );
  });

  it('lets the user pick an exact reminder date, no later than the due date', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-20'));
    await fireEvent.press(screen.getByTestId('reminder-custom'));
    await openDatePicker('reminder-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-21')); // after the due date: disabled
    expect(screen.queryByTestId('reminder-summary')).toBeNull();
    await fireEvent.press(screen.getByTestId('date-day-2026-10-12'));

    expect(screen.getByTestId('reminder-summary').props.children).toBe(
      'You will see a reminder from 12 Oct 2026.',
    );
  });

  it('saves the reminder and shows it on the bill', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Villa rent');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '3500');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-next'));
    await fireEvent.press(screen.getByTestId('date-next'));
    await fireEvent.press(screen.getByTestId('date-day-2026-12-15'));
    await fireEvent.press(screen.getByTestId('reminder-7'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    expect(screen.getByText('One-off · next 15 Dec 2026 (in 73 days)')).toBeTruthy();
    expect(screen.getByText('Reminder 7 days before')).toBeTruthy();
  });

  it('a reminder that has started appears on the Overview and in Insights', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Villa rent');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '3500');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-10')); // due in 7 days
    await fireEvent.press(screen.getByTestId('reminder-7')); // starts today
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.getByTestId('reminders-card')).toBeTruthy();
    expect(screen.getByText('Villa rent is due in 7 days (10 Oct 2026)')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('tab-insights'));
    await waitFor(() => expect(getPathname()).toBe('/insights'));
    expect(screen.getByText('Reminder: Villa rent')).toBeTruthy();
    expect(screen.getByText('Due in 7 days. The bill is AED 3,500.00.')).toBeTruthy();
  });

  it('a reminder that has not started yet is not shown', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await fireEvent.press(screen.getByTestId('frequency-once'));
    await fireEvent.changeText(screen.getByTestId('input-name'), 'Villa rent');
    await fireEvent.changeText(screen.getByTestId('input-amount'), '3500');
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-30'));
    await fireEvent.press(screen.getByTestId('reminder-3')); // starts 27 Oct
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.queryByTestId('reminders-card')).toBeNull();
  });

  it('choosing "No reminder" removes it', async () => {
    const { getPathname } = await openApp('/commitments');

    await startNewBill(getPathname);
    await openDatePicker('due-date-toggle');
    await fireEvent.press(screen.getByTestId('date-day-2026-10-20'));
    await fireEvent.press(screen.getByTestId('reminder-1'));
    expect(screen.getByTestId('reminder-summary')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reminder-none'));
    expect(screen.queryByTestId('reminder-summary')).toBeNull();
  });
});

describe('dates on income and goals', () => {
  it('the salary date sets the planning horizon', async () => {
    const { getPathname } = await openApp('/commitments');

    await fireEvent.press(screen.getByTestId('income-salary'));
    await waitFor(() => expect(getPathname()).toBe('/edit/income/salary'));
    await openDatePicker('next-date-toggle');
    await fireEvent.press(screen.getByTestId('date-next')); // November
    await fireEvent.press(screen.getByTestId('date-day-2026-11-02')); // 30 days away
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/commitments'));

    await fireEvent.press(screen.getByTestId('commitments-continue'));
    await waitFor(() => expect(getPathname()).toBe('/dashboard'));
    expect(screen.getByText(/until your next payday, in 30 days/)).toBeTruthy();
  });

  it('a goal deadline is chosen on the calendar and can be cleared', async () => {
    const { getPathname } = await openApp('/savings');

    await fireEvent.press(screen.getByTestId('goal-travel'));
    await waitFor(() => expect(getPathname()).toBe('/edit/goal/travel'));
    // The sample deadline is 150 days away: 28 left in Oct, +30 Nov, +31 Dec, +31 Jan, +28 Feb, +2 = 2 Mar 2027.
    expect(screen.getByText('2 Mar 2027 · in 150 days')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('deadline-clear'));
    expect(screen.getByText('Choose a date')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));

    // With no deadline the goal shows an ETA instead of a deadline warning.
    expect(
      screen.getByLabelText(
        /^Summer travel\. AED 2,400.00 of AED 8,000.00 · 30%\. About 14 months/,
      ),
    ).toBeTruthy();
  });
});
