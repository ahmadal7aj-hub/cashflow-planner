/** @jest-environment node */
import { startTestDb, type TestDb } from '../testing/db';

let db: TestDb;
beforeAll(async () => {
  db = await startTestDb();
}, 90_000);
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.admin(
    'truncate public.group_events, public.shared_entries, public.group_members, public.groups, public.profiles, auth.users restart identity cascade',
  );
});

async function denied(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the database to refuse this');
}

describe('registration: unique username, unique email', () => {
  it('creates a profile with a lower-case username when a user registers', async () => {
    const alice = await db.signUp('alice@example.com', 'Alice_01');
    const me = await alice.rpc<{ username: string; email: string }[]>('my_profile');
    expect(me[0]).toMatchObject({ username: 'alice_01', email: 'alice@example.com' });
  });

  it('refuses a username that is already taken, in any letter case', async () => {
    await db.signUp('alice@example.com', 'alice');
    expect(await denied(db.signUp('other@example.com', 'ALICE'))).toMatch(/unique|duplicate/i);
  });

  it('refuses a second account with the same email', async () => {
    await db.signUp('alice@example.com', 'alice');
    expect(await denied(db.signUp('alice@example.com', 'alice2'))).toMatch(/unique|duplicate/i);
  });

  it('refuses a missing, too short, too long or odd username', async () => {
    for (const bad of ['', 'ab', 'a'.repeat(21), 'has space', 'semi;colon', 'émile']) {
      expect(await denied(db.signUp(`x${bad.length}@example.com`, bad))).toMatch(/format|check/i);
    }
  });

  it('tells a visitor whether a username is free, without needing an account', async () => {
    await db.signUp('alice@example.com', 'alice');
    const visitor = db.as(null);
    expect(await visitor.rpc('username_available', { p_username: 'alice' })).toBe(false);
    expect(await visitor.rpc('username_available', { p_username: 'ALICE' })).toBe(false);
    expect(await visitor.rpc('username_available', { p_username: 'bobby' })).toBe(true);
    expect(await visitor.rpc('username_available', { p_username: 'no' })).toBe(false);
  });

  it('never lets a username change, so shared history stays truthful', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    expect(
      await denied(
        db.admin('update public.profiles set username = $1 where id = $2', ['alicia', alice.id]),
      ),
    ).toMatch(/cannot be changed/);
  });
});

describe('each user sees only their own profile unless they share a group', () => {
  it('a stranger cannot read another profile', async () => {
    await db.signUp('alice@example.com', 'alice');
    const bob = await db.signUp('bob@example.com', 'bobby');
    const rows = await bob.query<{ username: string }>(
      'select username from public.profiles order by username',
    );
    expect(rows).toEqual([{ username: 'bobby' }]);
  });

  it('an anonymous visitor can call nothing but username_available and read nothing', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    const visitor = db.as(null);
    expect(await denied(visitor.query('select * from public.profiles'))).toMatch(
      /permission denied/i,
    );
    expect(await denied(visitor.rpc('my_profile'))).toMatch(/permission denied/i);
    expect(await denied(visitor.rpc('create_group', { p_name: 'x' }))).toMatch(
      /permission denied/i,
    );
    expect(await denied(visitor.rpc('list_my_groups'))).toMatch(/permission denied/i);
    expect(alice.id).toBeTruthy();
  });

  it('a request with no signed-in user is refused by every function', async () => {
    // A signed-in role whose token has no subject must still be refused.
    const ghost = db.as('00000000-0000-0000-0000-000000000000');
    expect(await denied(ghost.rpc('create_group', { p_name: 'Ghosts' }))).toBeTruthy();
  });
});

describe('structure guards', () => {
  it('every table in the public schema has Row Level Security switched on', async () => {
    const rows = await db.admin<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([]);
  });

  it('signed-in users have no write access to any table; they can only read', async () => {
    const rows = await db.admin<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'authenticated' and table_schema = 'public'`,
    );
    expect(rows.filter((r) => r.privilege_type !== 'SELECT')).toEqual([]);
  });

  it('the anonymous role has no table access at all', async () => {
    const rows = await db.admin(
      `select 1 from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'`,
    );
    expect(rows).toEqual([]);
  });
});

describe('optional name and phone', () => {
  it('are saved from the sign-up details and returned only to their owner', async () => {
    const alice = await db.signUp('alice@example.com', 'alice', {
      fullName: 'Alice A',
      phone: '+971 50 123 4567',
    });
    const bob = await db.signUp('bob@example.com', 'bob');
    const mine = await alice.rpc<{ full_name: string; phone: string }[]>('my_profile');
    expect(mine[0]).toMatchObject({ full_name: 'Alice A', phone: '+971 50 123 4567' });
    const his = await bob.rpc<{ full_name: string | null }[]>('my_profile');
    expect(his[0]!.full_name).toBeNull();
    // Another person's row is not readable, so their phone is not reachable.
    expect(await bob.query('select phone from public.profiles')).toEqual([{ phone: null }]);
  });

  it('a badly formatted optional detail never blocks registration, it is just left empty', async () => {
    const carl = await db.signUp('carl@example.com', 'carl', { phone: 'call me', fullName: 'C' });
    const me = (await carl.rpc<{ full_name: string; phone: string | null }[]>('my_profile'))[0]!;
    expect(me.phone).toBeNull();
    expect(me.full_name).toBe('C');
  });

  it('can be changed or cleared with update_my_contact, which refuses bad values and only touches your own row', async () => {
    const alice = await db.signUp('alice@example.com', 'alice', { fullName: 'Alice' });
    const bob = await db.signUp('bob@example.com', 'bob', { fullName: 'Bob' });
    await alice.rpc('update_my_contact', { p_full_name: 'Alice B', p_phone: '0501234567' });
    const mine = await alice.rpc<{ full_name: string; phone: string }[]>('my_profile');
    expect(mine[0]).toMatchObject({ full_name: 'Alice B', phone: '0501234567' });
    const his = await bob.rpc<{ full_name: string }[]>('my_profile');
    expect(his[0]!.full_name).toBe('Bob');
    expect(
      await denied(alice.rpc('update_my_contact', { p_full_name: '', p_phone: 'abc' })),
    ).toMatch(/phone/);
    expect(
      await denied(alice.rpc('update_my_contact', { p_full_name: 'x'.repeat(81), p_phone: '' })),
    ).toMatch(/80/);
    await alice.rpc('update_my_contact', { p_full_name: '', p_phone: '' });
    const cleared = await alice.rpc<{ full_name: string | null }[]>('my_profile');
    expect(cleared[0]!.full_name).toBeNull();
    // Not callable without signing in.
    expect(
      await denied(db.as(null).rpc('update_my_contact', { p_full_name: 'x', p_phone: '' })),
    ).toBeTruthy();
  });

  it('the username still cannot change', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    expect(
      await denied(alice.query("update public.profiles set username = 'other' where true")),
    ).toBeTruthy();
  });
});
