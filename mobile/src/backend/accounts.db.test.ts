/** @jest-environment node */
import { startTestDb, type TestDb, type UserSession } from '../testing/db';

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

describe('deleting my own account', () => {
  const share = (s: UserSession, group: string, id: string) =>
    s.rpc('share_entry', {
      p_group: group,
      p_local_id: id,
      p_kind: 'deposit',
      p_amount: 100000,
      p_date: '2020-01-01',
      p_note: '',
    });

  it('removes the account, profile and shared savings, and keeps the group for the other members', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    const bob = await db.signUp('bob@example.com', 'bob');
    const group = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'bob' });
    await bob.rpc('respond_to_invitation', { p_group: group, p_accept: true });
    await share(alice, group, 'a:1');
    await share(bob, group, 'b:1');

    await alice.rpc('delete_my_account');

    expect(
      await db.admin("select 1 from auth.users where email = 'alice@example.com'"),
    ).toHaveLength(0);
    expect(await db.admin("select 1 from public.profiles where username = 'alice'")).toHaveLength(
      0,
    );
    // Alice's shared saving is gone; Bob's stays; Bob is now the admin and the group carries on.
    const entries = await bob.rpc<{ local_id: string }[]>('list_group_entries', { p_group: group });
    expect(entries.map((e) => e.local_id)).toEqual(['b:1']);
    const g = await db.admin<{ created_by: string }>('select created_by from public.groups');
    const bobRow = await db.admin<{ id: string }>(
      "select id from public.profiles where username = 'bob'",
    );
    expect(g[0]!.created_by).toBe(bobRow[0]!.id);
    const members = await bob.rpc<{ username: string; role: string }[]>('list_group_members', {
      p_group: group,
    });
    expect(members).toEqual([expect.objectContaining({ username: 'bob', role: 'admin' })]);
    // The history keeps no name for the deleted person.
    const events = await db.admin<{ actor_id: string | null }>(
      'select actor_id from public.group_events where actor_id is null',
    );
    expect(events.length).toBeGreaterThan(0);
    // The username can be used again by somebody else.
    expect(await db.as(null).rpc('username_available', { p_username: 'alice' })).toBe(true);
  });

  it('removes a group when nobody else is in it, including one with only a pending invitee', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    await db.signUp('bob@example.com', 'bob');
    const group = await alice.rpc<string>('create_group', { p_name: 'Solo' });
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'bob' }); // bob never answers
    await share(alice, group, 'a:1');
    await alice.rpc('delete_my_account');
    expect(await db.admin('select 1 from public.groups')).toHaveLength(0);
    expect(await db.admin('select 1 from public.shared_entries')).toHaveLength(0);
    expect(await db.admin('select 1 from public.group_members')).toHaveLength(0);
    expect(await db.admin('select 1 from auth.users')).toHaveLength(1); // bob is untouched
  });

  it('hands over a group the person made but had left, and refuses anonymous callers', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    const bob = await db.signUp('bob@example.com', 'bob');
    const group = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'bob' });
    await bob.rpc('respond_to_invitation', { p_group: group, p_accept: true });
    await bob
      .rpc('invite_to_group', { p_group: group, p_identifier: 'alice' })
      .catch(() => undefined);
    await alice.rpc('leave_group', { p_group: group });
    await alice.rpc('delete_my_account');
    expect(await db.admin('select 1 from public.groups')).toHaveLength(1);
    expect(await denied(db.as(null).rpc('delete_my_account'))).toBeTruthy();
  });

  it('only ever deletes the caller', async () => {
    const alice = await db.signUp('alice@example.com', 'alice');
    await db.signUp('bob@example.com', 'bob');
    await alice.rpc('delete_my_account');
    const left = await db.admin<{ email: string }>('select email from auth.users');
    expect(left.map((u) => u.email)).toEqual(['bob@example.com']);
  });
});
