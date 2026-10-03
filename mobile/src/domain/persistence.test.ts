import { emptyPlan } from './budgetModel';
import { aedToFils as aed } from './money';
import {
  BACKUP_PREFIX,
  CURRENT_SCHEMA,
  STORAGE_KEY,
  loadPlan,
  normalizePlan,
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
