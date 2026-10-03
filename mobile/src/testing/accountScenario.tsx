import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { planKeyFor, savePlan } from '../domain/persistence';
import { setTestBackend } from '../state/testBackend';
import { setTestSeed } from '../state/testSeed';
import {
  aed,
  freshPlan,
  openAccountsApp,
  realToday,
  settle,
  signInViaUi,
  startTestDb,
} from './accountsApp';
import type { TestDb } from './db';
import { groupOf } from './dbHarness';
import { TestBackend } from './fakeBackend';

export { aed, settle, signInViaUi };

/** One real test database per file, emptied before each test; the app is unmounted after each test. */
export function withAccountDb(): { db: () => TestDb } {
  let current: TestDb;
  beforeAll(async () => {
    current = await startTestDb();
  }, 90_000);
  afterAll(async () => {
    await current.close();
  });
  beforeEach(async () => {
    await current.admin(
      'truncate public.group_events, public.shared_entries, public.group_members, public.groups, public.profiles, auth.users restart identity cascade',
    );
    await AsyncStorage.clear();
  });
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    setTestBackend(undefined);
    setTestSeed(undefined);
  });
  return { db: () => current };
}

export const type = (id: string, value: string) =>
  fireEvent.changeText(screen.getByTestId(`input-${id}`), value);

export const personalTotal = () => within(screen.getByTestId('total-savings-card'));

export interface World {
  db: TestDb;
  backend: TestBackend;
  aliceId: string;
  bobId: string;
  carolId: string;
  group: string;
  today: string;
}

export const PASSWORDS = {
  alice: 'alice-password-1',
  bob: 'bobby-password-1',
  carol: 'carol-password-1',
} as const;

/** Alice, Bob and Carol are registered. Alice and Bob are in one group. Everyone has a fresh personal plan. */
export async function world(db: TestDb): Promise<World> {
  const backend = new TestBackend(db);
  const aliceId = await backend.createAccount('alice@example.com', 'alice', PASSWORDS.alice);
  const bobId = await backend.createAccount('bob@example.com', 'bobby', PASSWORDS.bob);
  const carolId = await backend.createAccount('carol@example.com', 'carol', PASSWORDS.carol);
  const group = await groupOf(db.as(aliceId), [db.as(bobId)], 'Home');
  const today = realToday();
  for (const id of [aliceId, bobId, carolId]) {
    await savePlan(AsyncStorage, freshPlan(today), planKeyFor(id));
  }
  return { db, backend, aliceId, bobId, carolId, group, today };
}

export type Person = 'alice' | 'bob' | 'carol';

/** After signing in the app starts from the welcome page; Start leads to the dashboard. */
export async function enterApp(db: TestDb) {
  await settle(db, 2); // let the app finish returning to the welcome page
  await waitFor(() => expect(screen.getByTestId('start-button')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('start-button'));
  await waitFor(() => expect(screen.getByTestId('dashboard-screen')).toBeTruthy());
  await settle(db);
}

export async function start(w: World, who: Person = 'alice') {
  const app = await openAccountsApp(w.db, '/dashboard', {
    backend: w.backend,
    seed: 'storage',
    today: w.today,
  });
  await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
  await signInViaUi(`${who}@example.com`, PASSWORDS[who]);
  await enterApp(w.db);
  return app;
}

export async function signOut(getPathname: () => string) {
  await act(async () => router.push('/account'));
  await waitFor(() => expect(getPathname()).toBe('/account'));
  await fireEvent.press(screen.getByTestId('signout'));
  await fireEvent.press(screen.getByTestId('signout-confirm'));
  await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
}

export async function switchTo(w: World, getPathname: () => string, who: Person) {
  await signOut(getPathname);
  await signInViaUi(`${who}@example.com`, PASSWORDS[who]);
  await enterApp(w.db);
}

export async function addSaving(
  w: World,
  getPathname: () => string,
  amount: string,
  opts: { groupId?: string; direction?: 'in' | 'out'; date?: string } = {},
) {
  const direction = opts.direction ?? 'in';
  await fireEvent.press(screen.getByTestId('tab-savings'));
  await fireEvent.press(screen.getByTestId(direction === 'in' ? 'savings-add' : 'savings-take'));
  await waitFor(() => expect(getPathname()).toBe(`/edit/savings-${direction}/new`));
  await type('amount', amount);
  if (opts.groupId) await fireEvent.press(screen.getByTestId(`share-${opts.groupId}`));
  await fireEvent.press(screen.getByTestId('edit-save'));
  await waitFor(() => expect(getPathname()).toBe('/savings'));
  await settle(w.db);
}

export function sharedRows(db: TestDb) {
  return db.admin<{ local_id: string; amount: string; owner: string; entry_date: string }>(
    `select e.local_id, e.amount::text, p.username as owner, e.entry_date::text as entry_date
     from public.shared_entries e join public.profiles p on p.id = e.owner_id
     order by e.entry_date, e.amount`,
  );
}

export async function openRoute(getPathname: () => string, path: string) {
  await act(async () => router.push(path as never));
  await waitFor(() => expect(getPathname()).toBe(path));
}
