import { emptyPlan, type Plan } from './budgetModel';

/**
 * Saving the plan on the device. Pure apart from the store it is given (AsyncStorage in the app, a memory store in
 * tests). The data never leaves the phone.
 *
 * Safety rules:
 *  - The saved data is wrapped with a schema version so later versions can migrate it.
 *  - Before any migration, and before touching data that cannot be read, a backup copy is written under its own
 *    key. Nothing is ever deleted or overwritten without a backup.
 *  - Data written by a NEWER app version is never loaded or overwritten by this one.
 */
export const STORAGE_KEY = 'cashflow.plan';
export const BACKUP_PREFIX = 'cashflow.backup.';
export const CURRENT_SCHEMA = 2;

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** Each signed-in account keeps its own plan under its own key; the plain key is the phone's original data. */
export const USER_PLAN_PREFIX = 'cashflow.plan.';
export const ADOPTED_KEY = 'cashflow.adopted';
export const DEVICE_KEY = 'cashflow.device';

export function planKeyFor(userId: string | null | undefined): string {
  return userId ? `${USER_PLAN_PREFIX}${userId}` : STORAGE_KEY;
}

function suffixFor(key: string): string {
  return key === STORAGE_KEY ? '' : `.${key}`;
}

interface Envelope {
  schemaVersion: number;
  plan: unknown;
}

export type Migration = (plan: unknown) => unknown;

/** Migrations from version N to N+1, keyed by N. There are none yet: version 2 is the first saved format. */
export const MIGRATIONS: Record<number, Migration> = {};

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; plan: Plan; migratedFrom: number | null }
  | { status: 'unreadable'; backupKey: string }
  | { status: 'newer-version'; version: number };

/** Fill in anything missing so older or partial data still has every list the app expects. */
export function normalizePlan(raw: unknown): Plan {
  const base = emptyPlan();
  if (typeof raw !== 'object' || raw === null) return base;
  const r = raw as Partial<Plan>;
  return {
    ...base,
    ...r,
    savings: { ...base.savings, ...(r.savings ?? {}) },
    income: r.income ?? [],
    expenses: r.expenses ?? [],
    retiredIncome: r.retiredIncome ?? [],
    retiredExpenses: r.retiredExpenses ?? [],
    transactions: r.transactions ?? [],
    goals: r.goals ?? [],
    investments: r.investments ?? [],
  };
}

export async function loadPlan(
  store: KeyValueStore,
  stamp: string,
  migrations: Record<number, Migration> = MIGRATIONS,
  key: string = STORAGE_KEY,
): Promise<LoadResult> {
  const text = await store.getItem(key);
  if (text === null) return { status: 'empty' };

  let env: Envelope;
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Envelope).schemaVersion !== 'number'
    )
      throw new Error('bad envelope');
    env = parsed as Envelope;
  } catch {
    const backupKey = `${BACKUP_PREFIX}unreadable.${stamp}${suffixFor(key)}`;
    await store.setItem(backupKey, text);
    return { status: 'unreadable', backupKey };
  }

  if (env.schemaVersion > CURRENT_SCHEMA)
    return { status: 'newer-version', version: env.schemaVersion };

  let plan = env.plan;
  let version = env.schemaVersion;
  const from = version;
  if (version < CURRENT_SCHEMA) {
    await store.setItem(`${BACKUP_PREFIX}v${from}.${stamp}${suffixFor(key)}`, text);
    while (version < CURRENT_SCHEMA) {
      const step = migrations[version];
      if (!step) break;
      plan = step(plan);
      version++;
    }
  }
  return {
    status: 'ok',
    plan: normalizePlan(plan),
    migratedFrom: from < CURRENT_SCHEMA ? from : null,
  };
}

export async function savePlan(
  store: KeyValueStore,
  plan: Plan,
  key: string = STORAGE_KEY,
): Promise<void> {
  const env: Envelope = { schemaVersion: CURRENT_SCHEMA, plan };
  await store.setItem(key, JSON.stringify(env));
}

/**
 * The first account to sign in on a phone takes over the data that was already on it (so nothing entered before
 * accounts existed is lost). It is COPIED: the original stays where it was, and a backup is written. Later
 * accounts on the same phone start empty, so nobody sees another person's records.
 * Returns true when data was adopted.
 */
export async function adoptLegacyPlan(
  store: KeyValueStore,
  userId: string,
  stamp: string,
): Promise<boolean> {
  const userKey = planKeyFor(userId);
  if ((await store.getItem(userKey)) !== null) return false;
  if ((await store.getItem(ADOPTED_KEY)) !== null) return false;
  const legacy = await store.getItem(STORAGE_KEY);
  if (legacy === null) return false;
  await store.setItem(`${BACKUP_PREFIX}adopted.${stamp}`, legacy);
  await store.setItem(userKey, legacy);
  await store.setItem(ADOPTED_KEY, userId);
  return true;
}

/** A random id for this phone, kept for good. Savings shared from this phone are keyed by it. */
export async function getDeviceId(store: KeyValueStore): Promise<string> {
  const existing = await store.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `d${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  await store.setItem(DEVICE_KEY, id);
  return id;
}
