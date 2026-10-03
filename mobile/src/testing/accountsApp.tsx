import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { setTestBackend } from '../state/testBackend';
import { setTestSeed } from '../state/testSeed';
import { emptyPlan, type Plan } from '../domain/budgetModel';
import { toISO, type ISODate } from '../domain/dates';
import { monthStart } from '../domain/months';
import { setOpeningSavings } from '../domain/planOps';
import { aed, routes } from './app';
import { startTestDb, type TestDb } from './db';
import { TestBackend } from './fakeBackend';

/**
 * The whole app with accounts switched on, talking to a real test database. `setup` can create accounts first. The
 * personal plan starts empty (or from `seed`) for every account on this phone, kept apart per account.
 */
export async function openAccountsApp(
  db: TestDb,
  initialUrl = '/dashboard',
  opts: { seed?: Plan | 'storage'; today?: string; backend?: TestBackend } = {},
) {
  const today = opts.today ?? realToday();
  jest.useFakeTimers({ now: new Date(`${today}T08:00:00`) });
  const backend = opts.backend ?? new TestBackend(db);
  setTestBackend(backend);
  setTestSeed(opts.seed === 'storage' ? undefined : (opts.seed ?? emptyPlan()));
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { backend, getPathname: () => rendered.getPathname() };
}

export { startTestDb };

/**
 * The database refuses savings dated in the future by ITS clock, so account tests run on the real current date
 * (read before fake timers are switched on).
 */
export function realToday(): ISODate {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** A day in the current or an earlier month: monthDay(0, 1) is the 1st of this month, monthDay(-1, 10) the 10th of last. */
export function monthDay(offset: number, day: number, today: ISODate = realToday()): ISODate {
  const [y, m] = today.split('-').map(Number) as [number, number];
  const index = y * 12 + (m - 1) + offset;
  const yy = Math.floor(index / 12);
  const mm = (index % 12) + 1;
  return toISO(yy, mm, day);
}

/** A set-up user with no savings yet: existing savings AED 0 from the 1st of the month before last. */
export function freshPlan(today: ISODate = realToday()): Plan {
  return setOpeningSavings(
    { ...emptyPlan(), setupDone: true },
    0,
    monthStart(monthDay(-2, 1, today).slice(0, 7)),
    today,
  );
}

/** Let queued database calls, timers and state updates finish. */
export async function settle(db: TestDb, rounds = 4) {
  for (let i = 0; i < rounds; i++) {
    await act(async () => {
      jest.advanceTimersByTime(50);
      for (let j = 0; j < 30; j++) await Promise.resolve();
    });
    await db.admin('select 1'); // everything sent to the database before this has finished
  }
}

export async function signInViaUi(email: string, password: string) {
  await fireEvent.changeText(screen.getByTestId('input-auth-email'), email);
  await fireEvent.changeText(screen.getByTestId('input-auth-password'), password);
  await fireEvent.press(screen.getByTestId('auth-submit'));
}

export { aed };
