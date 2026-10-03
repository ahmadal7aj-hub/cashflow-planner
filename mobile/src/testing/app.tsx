import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import Budget from '../app/(tabs)/budget';
import Dashboard from '../app/(tabs)/dashboard';
import Income from '../app/(tabs)/income';
import Savings from '../app/(tabs)/savings';
import Spending from '../app/(tabs)/spending';
import EditItem from '../app/edit/[kind]/[id]';
import Explain from '../app/explain/[metric]';
import Index from '../app/index';
import Investments from '../app/investments';
import Account from '../app/account';
import GroupDetail from '../app/groups/[id]';
import Groups from '../app/groups/index';
import Onboarding from '../app/onboarding';
import Scenario from '../app/scenario';
import Settings from '../app/settings';
import Setup from '../app/setup';
import Warning from '../app/warning/[id]';
import { emptyPlan, type ExpenseItem, type IncomeItem, type Plan } from '../domain/budgetModel';
import { aedToFils } from '../domain/money';
import {
  addSavings,
  addTransaction,
  setOpeningSavings,
  setSavingsTarget,
  upsertExpenseItem,
  upsertIncomeItem,
} from '../domain/planOps';
import { setTestSeed } from '../state/testSeed';

export const routes = {
  _layout: RootLayout,
  index: Index,
  setup: Setup,
  investments: Investments,
  onboarding: Onboarding,
  account: Account,
  'groups/index': Groups,
  'groups/[id]': GroupDetail,
  settings: Settings,
  scenario: Scenario,
  'warning/[id]': Warning,
  'explain/[metric]': Explain,
  'edit/[kind]/[id]': EditItem,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/dashboard': Dashboard,
  '(tabs)/income': Income,
  '(tabs)/savings': Savings,
  '(tabs)/budget': Budget,
  '(tabs)/spending': Spending,
};

export const TODAY = '2026-10-15';

/**
 * RNTL v14 renders asynchronously and expo-router attaches getPathname to the returned promise.
 * `seed` is the plan the app starts from: `'storage'` loads what is saved on the (mock) device instead.
 */
export async function openApp(
  initialUrl = '/dashboard',
  opts: { seed?: Plan | 'storage'; today?: string } = {},
) {
  // Fix "today". Fake timers also let the testing library run screen transitions to the end.
  jest.useFakeTimers({ now: new Date(`${opts.today ?? TODAY}T08:00:00`) });
  setTestSeed(opts.seed === 'storage' ? undefined : (opts.seed ?? emptyPlan()));
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

/** Call from every test file that uses openApp. */
export function installTestLifecycle() {
  afterEach(async () => {
    // Unmount the app first so nothing from this test can write to the next test's storage.
    await cleanup();
    jest.useRealTimers();
    setTestSeed(undefined);
    await AsyncStorage.clear();
  });
}

export const aed = aedToFils;

export function salary(amount = 10000, nextDate = '2026-10-25'): IncomeItem {
  return {
    id: 'salary',
    name: 'Salary',
    kind: 'salary',
    amount: aed(amount),
    frequency: 'monthly',
    nextInDays: 0,
    nextDate,
    stable: true,
  };
}

export function everyday(
  id: string,
  categoryId: string,
  name: string,
  amount: number,
): ExpenseItem {
  return {
    id,
    name,
    categoryId,
    amount: aed(amount),
    frequency: 'monthly',
    nextDueInDays: 0,
    kind: 'variable',
    essential: true,
    spentSoFar: 0,
  };
}

export function bill(
  id: string,
  categoryId: string,
  name: string,
  amount: number,
  dueDate: string,
): ExpenseItem {
  return {
    id,
    name,
    categoryId,
    amount: aed(amount),
    frequency: 'monthly',
    nextDueInDays: 0,
    kind: 'fixed',
    essential: true,
    spentSoFar: 0,
    dueDate,
  };
}

/** A user who finished setup (opening AED 5,000 on 1 Sep 2026, target AED 1,000) with these items. */
export function userWith(items: { income?: IncomeItem[]; expenses?: ExpenseItem[] } = {}): Plan {
  let p: Plan = { ...emptyPlan(), setupDone: true };
  p = setOpeningSavings(p, aed(5000), '2026-09-01', '2026-09-01');
  p = setSavingsTarget(p, aed(1000), '2026-09-01');
  for (const i of items.income ?? []) p = upsertIncomeItem(p, i, '2026-09-01');
  for (const e of items.expenses ?? []) p = upsertExpenseItem(p, e, '2026-09-01');
  return p;
}

/** Simulates a finger dragging a SwipeableCard to the left. */
export async function swipeLeft(swipeTestID: string, distance = 140) {
  const front = screen.getByTestId(`${swipeTestID}-front`);
  const history = (dx: number, ts: number) => ({
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: ts,
    numberActiveTouches: 1,
    touchBank: [
      {
        touchActive: true,
        startPageX: 300,
        startPageY: 100,
        startTimeStamp: 0,
        currentPageX: 300 + dx,
        currentPageY: 100,
        currentTimeStamp: ts,
        previousPageX: 300,
        previousPageY: 100,
        previousTimeStamp: 0,
      },
    ],
  });
  // Call the responder handlers directly: the testing library skips them when the view cannot be started.
  const handlers = front.props as Record<string, (e: unknown) => void>;
  await act(async () => {
    handlers.onResponderGrant!({ touchHistory: history(0, 0), nativeEvent: {} });
    handlers.onResponderMove!({
      touchHistory: history(-distance, 50),
      nativeEvent: { pageX: 300 - distance, pageY: 100 },
    });
    handlers.onResponderRelease!({
      touchHistory: history(-distance, 100),
      nativeEvent: { pageX: 300 - distance, pageY: 100 },
    });
  });
}

/** Opens a DateField and chooses a day in the month that is showing. */
export async function pickDate(toggleTestID: string, iso: string) {
  await fireEvent.press(screen.getByTestId(toggleTestID));
  await fireEvent.press(screen.getByTestId(`date-day-${iso}`));
}

/**
 * A user since August 2026: salary AED 10,000 on the 25th, a groceries budget of AED 3,000, existing savings
 * AED 10,000 (from 2 Aug) with a target of AED 1,000. AED 800 spent in September, AED 500 in October, and
 * AED 2,000 added to savings on 6 Oct. With today = 15 Oct 2026, total savings is AED 14,000.
 */
export function dashboardWorld(): Plan {
  let p: Plan = { ...emptyPlan(), setupDone: true };
  p = setOpeningSavings(p, aed(10000), '2026-08-02', '2026-08-02');
  p = setSavingsTarget(p, aed(1000), '2026-08-02');
  p = upsertIncomeItem(p, salary(10000, '2026-08-25'), '2026-08-02');
  p = upsertExpenseItem(p, everyday('groc', 'groceries', 'Groceries', 3000), '2026-08-02');
  p = addTransaction(
    p,
    { date: '2026-09-10', categoryId: 'groceries', amount: aed(800), note: '' },
    TODAY,
  );
  p = addTransaction(
    p,
    { date: '2026-10-05', categoryId: 'groceries', amount: aed(500), note: '' },
    TODAY,
  );
  const r = addSavings(p, aed(2000), '2026-10-06', 'Extra', TODAY);
  if (!r.ok) throw new Error('setup');
  return r.plan;
}

/** Lets pending saves and loads finish (storage resolves on the microtask queue). */
export async function flush() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}
