import { emptyPlan } from './budgetModel';
import { aedToFils as aed } from './money';
import {
  BACKUP_PREFIX,
  CURRENT_SCHEMA,
  STORAGE_KEY,
  adoptLegacyPlan,
  getDeviceId,
  loadPlan,
  normalizePlan,
  planKeyFor,
  savePlan,
  type KeyValueStore,
} from './persistence';
import { addTransaction, setOpeningSavings } from './planOps';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => (k in data ? data[k]! : null),
    setItem: async (k, v) => {
      data[k] = v;
    },
  };
}

describe('saving and loading', () => {
  it('returns empty when nothing was saved', async () => {
    expect(await loadPlan(memoryStore(), 't')).toEqual({ status: 'empty' });
  });

  it('round-trips a plan exactly', async () => {
    let p = setOpeningSavings(emptyPlan(), aed(5000), '2026-10-01', '2026-10-01');
    p = addTransaction(
      p,
      { date: '2026-10-02', categoryId: 'fuel', amount: aed(200), note: 'x' },
      '2026-10-02',
    );
    const store = memoryStore();
    await savePlan(store, p);
    const r = await loadPlan(store, 't');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.plan).toEqual(p);
      expect(r.migratedFrom).toBeNull();
    }
  });

  it('fills in missing lists so partial data still works', () => {
    const p = normalizePlan({ income: [{ id: 'a' }] });
    expect(p.transactions).toEqual([]);
    expect(p.savings.movements).toEqual([]);
    expect(p.income).toHaveLength(1);
    expect(normalizePlan(null)).toEqual(emptyPlan());
  });
});

describe('safety', () => {
  it('backs up unreadable data instead of discarding it', async () => {
    const store = memoryStore({ [STORAGE_KEY]: '{not json' });
    const r = await loadPlan(store, '2026-10-03');
    expect(r.status).toBe('unreadable');
    if (r.status === 'unreadable') expect(store.data[r.backupKey]).toBe('{not json');
    expect(store.data[STORAGE_KEY]).toBe('{not json'); // original untouched
  });

  it('never loads or overwrites data from a newer app version', async () => {
    const raw = JSON.stringify({ schemaVersion: CURRENT_SCHEMA + 1, plan: {} });
    const store = memoryStore({ [STORAGE_KEY]: raw });
    const r = await loadPlan(store, 't');
    expect(r).toEqual({ status: 'newer-version', version: CURRENT_SCHEMA + 1 });
    expect(store.data[STORAGE_KEY]).toBe(raw);
  });

  it('backs up first, then migrates older data step by step', async () => {
    const old = JSON.stringify({ schemaVersion: 1, plan: { income: [{ id: 'old' }] } });
    const store = memoryStore({ [STORAGE_KEY]: old });
    const migrations = {
      1: (plan: unknown) => ({ ...(plan as object), setupDone: true }),
    };
    const r = await loadPlan(store, 'S', migrations);
    expect(store.data[`${BACKUP_PREFIX}v1.S`]).toBe(old);
    expect(store.data[STORAGE_KEY]).toBe(old); // not rewritten until the app saves
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.migratedFrom).toBe(1);
      expect(r.plan.setupDone).toBe(true);
      expect(r.plan.income).toHaveLength(1);
    }
  });
});

describe('one plan per account on a shared phone', () => {
  const user = (id: string) => planKeyFor(id);

  it('keeps each account plan under its own key', async () => {
    const store = memoryStore();
    await savePlan(store, userWith('a'), user('alice'));
    await savePlan(store, userWith('b'), user('bob'));
    const a = await loadPlan(store, 't', undefined, user('alice'));
    const b = await loadPlan(store, 't', undefined, user('bob'));
    expect(a.status === 'ok' && a.plan.income[0]?.id).toBe('a');
    expect(b.status === 'ok' && b.plan.income[0]?.id).toBe('b');
    // The phone's original (signed-out) plan is a third, separate key.
    expect((await loadPlan(store, 't')).status).toBe('empty');
  });

  it('the first account takes over the data already on the phone, as a copy with a backup', async () => {
    const store = memoryStore();
    await savePlan(store, userWith('original'));
    expect(await adoptLegacyPlan(store, 'alice', 'S')).toBe(true);
    const mine = await loadPlan(store, 't', undefined, user('alice'));
    expect(mine.status === 'ok' && mine.plan.income[0]?.id).toBe('original');
    expect(store.data[STORAGE_KEY]).toBeDefined(); // the original is still there
    expect(store.data[`${BACKUP_PREFIX}adopted.S`]).toBe(store.data[STORAGE_KEY]);
  });

  it('a second account on the same phone starts empty and never sees the first account data', async () => {
    const store = memoryStore();
    await savePlan(store, userWith('original'));
    await adoptLegacyPlan(store, 'alice', 'S');
    expect(await adoptLegacyPlan(store, 'bob', 'S2')).toBe(false);
    expect((await loadPlan(store, 't', undefined, user('bob'))).status).toBe('empty');
  });

  it('never overwrites an account that already has data, and does nothing when there is nothing to adopt', async () => {
    const store = memoryStore();
    expect(await adoptLegacyPlan(store, 'alice', 'S')).toBe(false);
    await savePlan(store, userWith('original'));
    await savePlan(store, userWith('mine'), user('alice'));
    expect(await adoptLegacyPlan(store, 'alice', 'S')).toBe(false);
    const mine = await loadPlan(store, 't', undefined, user('alice'));
    expect(mine.status === 'ok' && mine.plan.income[0]?.id).toBe('mine');
  });

  it('backs up unreadable data per account without touching other keys', async () => {
    const store = memoryStore({ [user('alice')]: '{broken', [STORAGE_KEY]: 'keep' });
    const r = await loadPlan(store, 'S', undefined, user('alice'));
    expect(r.status).toBe('unreadable');
    expect(store.data[`${BACKUP_PREFIX}unreadable.S.${user('alice')}`]).toBe('{broken');
    expect(store.data[STORAGE_KEY]).toBe('keep');
  });

  it('gives the phone one stable device id', async () => {
    const store = memoryStore();
    const first = await getDeviceId(store);
    expect(first).toMatch(/^d[a-z0-9]{6,}$/);
    expect(await getDeviceId(store)).toBe(first);
  });
});

function userWith(id: string) {
  return { ...emptyPlan(), income: [{ id } as never] };
}
