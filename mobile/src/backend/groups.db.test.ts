/** @jest-environment node */
import { groupOf, refused, share, withTestDb, who } from '../testing/dbHarness';

const { db } = withTestDb();

async function trio() {
  const alice = await db().signUp('alice@example.com', 'alice');
  const bob = await db().signUp('bob@example.com', 'bobby');
  const carol = await db().signUp('carol@example.com', 'carol');
  return { alice, bob, carol };
}

describe('connecting by invitation', () => {
  it('invites by username and the invitee must accept before anything is visible', async () => {
    const { alice, bob } = await trio();
    const g = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'bobby' });

    // Pending: Bob sees the invitation (group name and who invited him) and nothing else.
    const inv =
      await bob.rpc<{ group_id: string; group_name: string; invited_by_username: string }[]>(
        'my_invitations',
      );
    expect(inv).toHaveLength(1);
    expect(inv[0]).toMatchObject({ group_id: g, group_name: 'Home', invited_by_username: 'alice' });
    expect(await bob.rpc<unknown[]>('list_my_groups')).toEqual([]);

    await bob.rpc('respond_to_invitation', { p_group: g, p_accept: true });
    const groups = await bob.rpc<{ name: string; member_count: string }[]>('list_my_groups');
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: 'Home', member_count: '2' });
    expect(await bob.rpc<unknown[]>('my_invitations')).toEqual([]);
  });

  it('invites by email address, matching any letter case', async () => {
    const { alice, bob } = await trio();
    const g = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: '  BOB@Example.com ' });
    expect(await bob.rpc<unknown[]>('my_invitations')).toHaveLength(1);
  });

  it('a declined invitation gives no access, and the person can be invited again', async () => {
    const { alice, bob } = await trio();
    const g = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'bobby' });
    await bob.rpc('respond_to_invitation', { p_group: g, p_accept: false });
    expect(await bob.rpc<unknown[]>('list_my_groups')).toEqual([]);
    expect(await refused(bob.rpc('list_group_entries', { p_group: g }))).toMatch(/not a member/);

    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'bobby' });
    expect(await bob.rpc<unknown[]>('my_invitations')).toHaveLength(1);
  });

  it('there is nothing to answer once the invitation has been answered', async () => {
    const { alice, bob } = await trio();
    const g = await groupOf(alice, [bob]);
    expect(
      await refused(bob.rpc('respond_to_invitation', { p_group: g, p_accept: false })),
    ).toMatch(/no pending/);
  });

  it('does not reveal whether an account exists: unknown, self and duplicate invitations return quietly', async () => {
    const { alice, bob } = await trio();
    const g = await alice.rpc<string>('create_group', { p_name: 'Home' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'nobody_here' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'nobody@example.com' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'alice' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'bobby' });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'bobby' });
    expect(await bob.rpc<unknown[]>('my_invitations')).toHaveLength(1);
    const members = await alice.rpc<{ username: string; status: string }[]>('list_group_members', {
      p_group: g,
    });
    expect(members.map((m) => `${m.username}:${m.status}`)).toEqual([
      'alice:accepted',
      'bobby:pending',
    ]);
  });

  it('only an admin can invite or remove', async () => {
    const { alice, bob, carol } = await trio();
    const g = await groupOf(alice, [bob]);
    expect(
      await refused(bob.rpc('invite_to_group', { p_group: g, p_identifier: 'carol' })),
    ).toMatch(/admin/);
    expect(
      await refused(carol.rpc('invite_to_group', { p_group: g, p_identifier: 'carol' })),
    ).toMatch(/admin/);
    const { id: aliceId } = await who(alice);
    expect(await refused(bob.rpc('remove_member', { p_group: g, p_user: aliceId }))).toMatch(
      /admin/,
    );
  });

  it('a group can have more than two people', async () => {
    const { alice, bob, carol } = await trio();
    const g = await groupOf(alice, [bob, carol], 'Trip');
    for (const u of [alice, bob, carol]) {
      const members = await u.rpc<{ username: string }[]>('list_group_members', { p_group: g });
      expect(members.map((m) => m.username).sort()).toEqual(['alice', 'bobby', 'carol']);
    }
  });

  it('a group holds at most 20 people (accepted or pending)', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const g = await alice.rpc<string>('create_group', { p_name: 'Big' });
    for (let i = 0; i < 19; i++) {
      await db().signUp(`u${i}@example.com`, `user_${i}`);
      await alice.rpc('invite_to_group', { p_group: g, p_identifier: `user_${i}` });
    }
    await db().signUp('late@example.com', 'late_one');
    expect(
      await refused(alice.rpc('invite_to_group', { p_group: g, p_identifier: 'late_one' })),
    ).toMatch(/full/);
  });
});

describe('pending invitees and unrelated accounts have no access', () => {
  it('a pending invitee cannot read the group, its members, entries, history or totals', async () => {
    const { alice, bob, carol } = await trio();
    const g = await groupOf(alice, [bob]);
    await share(alice, g, 'a:1', 5000, '2026-10-01', 'deposit', 'secret');
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'carol' }); // carol is pending

    expect(await carol.query('select * from public.groups')).toEqual([]);
    expect(await carol.query('select * from public.shared_entries')).toEqual([]);
    expect(await carol.query('select * from public.group_events')).toEqual([]);
    const carolRows = await carol.query<{ user_id: string }>(
      'select user_id from public.group_members',
    );
    expect(carolRows).toHaveLength(1); // only her own invitation row
    expect(
      await carol.query("select username from public.profiles where username = 'alice'"),
    ).toEqual([]);
    for (const [fn, args] of [
      ['list_group_entries', { p_group: g }],
      ['list_group_members', { p_group: g }],
      ['list_group_events', { p_group: g }],
      ['group_savings_summary', { p_group: g, p_from: '2026-01-01', p_to: '2026-12-31' }],
    ] as const) {
      expect(await refused(carol.rpc(fn, args))).toMatch(/not a member/);
    }
    expect(await refused(share(carol, g, 'c:1', 1, '2026-10-01'))).toMatch(/belong/);
  });

  it('an unrelated account sees nothing of a group', async () => {
    const { alice, bob, carol } = await trio();
    const g = await groupOf(alice, [bob]);
    await share(alice, g, 'a:1', 5000, '2026-10-01');
    expect(await carol.query('select * from public.shared_entries')).toEqual([]);
    expect(await carol.rpc<unknown[]>('list_my_groups')).toEqual([]);
    expect(await refused(carol.rpc('list_group_entries', { p_group: g }))).toMatch(/not a member/);
    expect(await refused(carol.rpc('leave_group', { p_group: g }))).toMatch(/not an active member/);
  });

  it('a member cannot invite into, or read, another group', async () => {
    const { alice, bob, carol } = await trio();
    await groupOf(alice, [bob]);
    const theirs = await carol.rpc<string>('create_group', { p_name: 'Carols group' });
    expect(await refused(bob.rpc('list_group_entries', { p_group: theirs }))).toMatch(
      /not a member/,
    );
    expect(
      await refused(bob.rpc('invite_to_group', { p_group: theirs, p_identifier: 'alice' })),
    ).toMatch(/admin/);
  });

  it('members can see each other, but a stranger is still invisible', async () => {
    const { alice, bob, carol } = await trio();
    await groupOf(alice, [bob]);
    const visible = await bob.query<{ username: string }>(
      'select username from public.profiles order by username',
    );
    expect(visible.map((v) => v.username)).toEqual(['alice', 'bobby']);
    expect((await carol.query('select username from public.profiles')).length).toBe(1);
  });
});

describe('leaving, removal and ownership', () => {
  it('a member can leave and loses access at once; their shared savings stop being shared', async () => {
    const { alice, bob } = await trio();
    const g = await groupOf(alice, [bob]);
    await share(bob, g, 'b:1', 3000, '2026-10-02');
    await bob.rpc('leave_group', { p_group: g });

    expect(await refused(bob.rpc('list_group_entries', { p_group: g }))).toMatch(/not a member/);
    expect(await bob.query('select * from public.shared_entries')).toEqual([]);
    expect(await alice.rpc<unknown[]>('list_group_entries', { p_group: g })).toEqual([]);
    const events = await alice.rpc<{ kind: string; actor_username: string }[]>(
      'list_group_events',
      {
        p_group: g,
      },
    );
    expect(events[0]).toMatchObject({ kind: 'left', actor_username: 'bobby' });
    expect(await refused(share(bob, g, 'b:2', 1, '2026-10-02'))).toMatch(/belong/);
  });

  it('an admin can remove a member or cancel a pending invitation; the person loses access', async () => {
    const { alice, bob, carol } = await trio();
    const g = await groupOf(alice, [bob]);
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'carol' });
    const { id: bobId } = await who(bob);
    const { id: carolId } = await who(carol);
    await alice.rpc('remove_member', { p_group: g, p_user: bobId });
    await alice.rpc('remove_member', { p_group: g, p_user: carolId });
    expect(await refused(bob.rpc('list_group_entries', { p_group: g }))).toMatch(/not a member/);
    expect(await carol.rpc<unknown[]>('my_invitations')).toEqual([]);
    const members = await alice.rpc<{ username: string }[]>('list_group_members', { p_group: g });
    expect(members.map((m) => m.username)).toEqual(['alice']);
  });

  it('the longest-standing member takes over when the last admin leaves; an empty group is deleted', async () => {
    const { alice, bob, carol } = await trio();
    const g = await groupOf(alice, [bob, carol]);
    await alice.rpc('leave_group', { p_group: g });
    const members = await bob.rpc<{ username: string; role: string }[]>('list_group_members', {
      p_group: g,
    });
    expect(members.find((m) => m.username === 'bobby')!.role).toBe('admin');
    await bob.rpc('invite_to_group', { p_group: g, p_identifier: 'alice' }); // the new admin can invite

    await bob.rpc('leave_group', { p_group: g });
    await carol.rpc('leave_group', { p_group: g });
    expect(await db().admin('select * from public.groups')).toEqual([]);
  });

  it('a former member can be invited back and must accept again', async () => {
    const { alice, bob } = await trio();
    const g = await groupOf(alice, [bob]);
    await bob.rpc('leave_group', { p_group: g });
    await alice.rpc('invite_to_group', { p_group: g, p_identifier: 'bobby' });
    expect(await refused(bob.rpc('list_group_entries', { p_group: g }))).toMatch(/not a member/);
    await bob.rpc('respond_to_invitation', { p_group: g, p_accept: true });
    expect(await bob.rpc<unknown[]>('list_group_entries', { p_group: g })).toEqual([]);
  });
});
