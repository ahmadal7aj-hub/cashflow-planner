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
