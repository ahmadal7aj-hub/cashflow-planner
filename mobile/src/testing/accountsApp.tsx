import { renderRouter } from 'expo-router/testing-library';

import { setTestBackend } from '../state/testBackend';
import { setTestSeed } from '../state/testSeed';
import { emptyPlan, type Plan } from '../domain/budgetModel';
import { routes, TODAY } from './app';
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
  jest.useFakeTimers({ now: new Date(`${opts.today ?? TODAY}T08:00:00`) });
  const backend = opts.backend ?? new TestBackend(db);
  setTestBackend(backend);
  setTestSeed(opts.seed === 'storage' ? undefined : (opts.seed ?? emptyPlan()));
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { backend, getPathname: () => rendered.getPathname() };
}

export { startTestDb };
