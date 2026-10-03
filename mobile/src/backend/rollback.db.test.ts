/** @jest-environment node */
import fs from 'node:fs';
import path from 'node:path';

import { startTestDb, type TestDb } from '../testing/db';

let db: TestDb;
beforeAll(async () => {
  db = await startTestDb();
}, 90_000);
afterAll(async () => {
  await db.close();
});

describe('the backend can be removed again', () => {
  it('the rollback script removes every table and function the migration created, and keeps the accounts', async () => {
    // Registered people and a shared saving exist before the rollback.
    const alice = await db.signUp('alice@example.com', 'alice');
    const group = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('share_entry', {
      p_group: group,
      p_local_id: 'd:1',
      p_kind: 'deposit',
      p_amount: 100,
      p_date: '2020-01-01',
      p_note: '',
    });

    const script = fs.readFileSync(
      path.resolve(__dirname, '../../../supabase/rollback/20261003000000_down.sql'),
      'utf8',
    );
    await db.admin(script);

    const tables = await db.admin<{ n: string }>(
      "select count(*)::text as n from information_schema.tables where table_schema = 'public'",
    );
    const functions = await db.admin<{ n: string }>(
      `select count(*)::text as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'`,
    );
    expect(tables[0]!.n).toBe('0');
    expect(functions[0]!.n).toBe('0');
    // The sign-in accounts themselves are not deleted by the script.
    expect(await db.admin('select 1 from auth.users')).toHaveLength(1);
  });

  it('running the rollback twice is harmless', async () => {
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../../supabase/rollback/20261003000000_down.sql'),
      'utf8',
    );
    await expect(db.admin(script)).resolves.toBeDefined();
  });
});

describe('the profile name and phone migration can be undone on its own', () => {
  it('removes the columns and the new function, restores the old profile shape, and keeps everything else', async () => {
    const db2 = await startTestDb();
    try {
      const alice = await db2.signUp('alice@example.com', 'alice', { fullName: 'Alice' });
      await alice.rpc<string>('create_group', { p_name: 'Home' });
      const script = fs.readFileSync(
        path.resolve(__dirname, '../../../supabase/rollback/20261004000000_down.sql'),
        'utf8',
      );
      await db2.admin(script);
      const cols = await db2.admin<{ column_name: string }>(
        "select column_name from information_schema.columns where table_name = 'profiles'",
      );
      expect(cols.map((c) => c.column_name).sort()).toEqual(['created_at', 'id', 'username']);
      const me = await alice.rpc<Record<string, unknown>[]>('my_profile');
      expect(Object.keys(me[0]!).sort()).toEqual(['email', 'id', 'username']);
      expect(await alice.rpc('list_my_groups')).toHaveLength(1);
      // Registration still works with the old trigger, even if a newer app sends a name.
      await db2.signUp('bob@example.com', 'bob', { fullName: 'Bob' });
      await expect(db2.admin(script)).resolves.toBeDefined(); // harmless to run twice
    } finally {
      await db2.close();
    }
  }, 120_000);
});

describe('the delete-my-account migration can be undone on its own', () => {
  it('removes only the function, and running it twice is harmless', async () => {
    const db3 = await startTestDb();
    try {
      const alice = await db3.signUp('alice@example.com', 'alice');
      const script = fs.readFileSync(
        path.resolve(__dirname, '../../../supabase/rollback/20261005000000_down.sql'),
        'utf8',
      );
      await db3.admin(script);
      await expect(alice.rpc('delete_my_account')).rejects.toThrow();
      expect(await alice.rpc('list_my_groups')).toEqual([]);
      await expect(db3.admin(script)).resolves.toBeDefined();
    } finally {
      await db3.close();
    }
  }, 120_000);
});
