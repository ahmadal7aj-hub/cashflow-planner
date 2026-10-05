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
beforeEach(async () => {
  await db.admin(
    'truncate public.group_events, public.shared_entries, public.group_members, public.groups, public.profiles, auth.users restart identity cascade',
  );
  await db.admin('truncate public.pending_invites');
});

async function denied(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the database to refuse this');
}

async function setup() {
  const alice = await db.signUp('alice@example.com', 'alice');
  const group = await alice.rpc<string>('create_group', { p_name: 'Home' });
  return { alice, group };
}

describe('inviting an email address that has no account yet', () => {
  it('answers quietly, the same as for an unknown username, and stores only a hash', async () => {
    const { alice, group } = await setup();
    await expect(
      alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' }),
    ).resolves.toBeNull();
    await expect(
      alice.rpc('invite_to_group', { p_group: group, p_identifier: 'nobody_here' }),
    ).resolves.toBeNull();
    const rows = await db.admin<{ email_hash: string }>(
      'select email_hash from public.pending_invites',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain('dana');
  });

  it('becomes a pending invitation when somebody registers with that email, and needs accepting', async () => {
    const { alice, group } = await setup();
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: '  Dana@Example.com ' });
    const dana = await db.signUp('dana@example.com', 'dana');

    // Invited, but not a member: no group, no entries, no totals.
    expect(await dana.rpc('list_my_groups')).toEqual([]);
    const invites =
      await dana.rpc<{ group_name: string; invited_by_username: string }[]>('my_invitations');
    expect(invites).toEqual([
      expect.objectContaining({ group_name: 'Home', invited_by_username: 'alice' }),
    ]);
    expect(await denied(dana.rpc('list_group_entries', { p_group: group }))).toMatch(
      /not a member/,
    );
    // The waiting invitation is used up.
    expect(await db.admin('select 1 from public.pending_invites')).toHaveLength(0);

    await dana.rpc('respond_to_invitation', { p_group: group, p_accept: true });
    const groups = await dana.rpc<{ name: string }[]>('list_my_groups');
    expect(groups.map((g) => g.name)).toEqual(['Home']);
    const events = await alice.rpc<{ kind: string }[]>('list_group_events', { p_group: group });
    expect(events.map((e) => e.kind)).toContain('invited');
  });

  it('a person who declines is not invited again by the same waiting invitation', async () => {
    const { alice, group } = await setup();
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' });
    const dana = await db.signUp('dana@example.com', 'dana');
    await dana.rpc('respond_to_invitation', { p_group: group, p_accept: false });
    expect(await dana.rpc('my_invitations')).toEqual([]);
  });

  it('ignores badly formed addresses and keeps at most 20 waiting per group', async () => {
    const { alice, group } = await setup();
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'not an@email' });
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'a@b' });
    expect(await db.admin('select 1 from public.pending_invites')).toHaveLength(0);
    for (let i = 0; i < 25; i++) {
      await alice.rpc('invite_to_group', { p_group: group, p_identifier: `p${i}@example.com` });
    }
    expect(await db.admin('select 1 from public.pending_invites')).toHaveLength(20);
  });

  it('forgets waiting invitations after 30 days', async () => {
    const { alice, group } = await setup();
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' });
    await db.admin("update public.pending_invites set created_at = now() - interval '31 days'");
    const dana = await db.signUp('dana@example.com', 'dana');
    expect(await dana.rpc('my_invitations')).toEqual([]);
  });

  it('only a group admin can leave one, and nobody can read or change the waiting list directly', async () => {
    const { alice, group } = await setup();
    const bob = await db.signUp('bob@example.com', 'bob');
    expect(
      await denied(
        bob.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' }),
      ),
    ).toMatch(/only a group admin/);
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' });
    expect(await denied(alice.query('select * from public.pending_invites'))).toMatch(
      /permission denied/,
    );
    expect(
      await denied(
        alice.query(
          "insert into public.pending_invites values ('" +
            group +
            "', repeat('a', 64), '" +
            alice.id +
            "')",
        ),
      ),
    ).toMatch(/permission denied/);
    expect(
      await denied(db.as(null).rpc('invite_to_group', { p_group: group, p_identifier: 'x@y.zz' })),
    ).toBeTruthy();
  });

  it('removing the group, or deleting the inviter, removes the waiting invitation', async () => {
    const { alice, group } = await setup();
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' });
    await alice.rpc('delete_my_account');
    expect(await db.admin('select 1 from public.pending_invites')).toHaveLength(0);
    const dana = await db.signUp('dana@example.com', 'dana');
    expect(await dana.rpc('my_invitations')).toEqual([]);
    expect(group).toBeTruthy();
  });

  it('inviting an email that already has an account still works as before', async () => {
    const { alice, group } = await setup();
    const bob = await db.signUp('bob@example.com', 'bob');
    await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'bob@example.com' });
    const invites = await bob.rpc<unknown[]>('my_invitations');
    expect(invites).toHaveLength(1);
    expect(await db.admin('select 1 from public.pending_invites')).toHaveLength(0);
  });
});

describe('the pending-invite migration can be undone on its own', () => {
  it('drops the waiting list and restores the old invite behaviour', async () => {
    const db2 = await startTestDb();
    try {
      const alice = await db2.signUp('alice@example.com', 'alice');
      const group = await alice.rpc<string>('create_group', { p_name: 'Home' });
      await alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' });
      const script = fs.readFileSync(
        path.resolve(__dirname, '../../../supabase/rollback/20261006000000_down.sql'),
        'utf8',
      );
      await db2.admin(script);
      expect(
        await db2.admin("select 1 from pg_tables where tablename = 'pending_invites'"),
      ).toHaveLength(0);
      await expect(
        alice.rpc('invite_to_group', { p_group: group, p_identifier: 'dana@example.com' }),
      ).resolves.toBeNull();
      const dana = await db2.signUp('dana@example.com', 'dana');
      expect(await dana.rpc('my_invitations')).toEqual([]);
      await expect(db2.admin(script)).resolves.toBeDefined(); // harmless twice
    } finally {
      await db2.close();
    }
  }, 120_000);
});
