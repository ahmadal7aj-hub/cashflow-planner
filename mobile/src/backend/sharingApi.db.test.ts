/** @jest-environment node */
import { RPC_SHAPES } from './contract';
import { createSharingApi } from './sharingApi';
import { aed, refused, withTestDb } from '../testing/dbHarness';

const { db } = withTestDb();

function mon(offset: number) {
  const now = new Date();
  const index = now.getFullYear() * 12 + now.getMonth() + offset;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    first: `${y}-${pad(m)}-01`,
    last: `${y}-${pad(m)}-${pad(last)}`,
    day: (d: number) => `${y}-${pad(m)}-${pad(d)}`,
  };
}

describe('the typed API the app uses, against the real database functions', () => {
  it('creates a group, invites, accepts, shares, reads totals and history, and leaves', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const bob = await db().signUp('bob@example.com', 'bobby');
    const a = createSharingApi(alice);
    const b = createSharingApi(bob);
    const m1 = mon(-1);

    const group = await a.createGroup('Home');
    await a.invite(group, 'bobby');
    const invites = await b.myInvitations();
    expect(invites).toEqual([
      expect.objectContaining({ groupId: group, groupName: 'Home', invitedBy: 'alice' }),
    ]);
    expect(await b.myGroups()).toEqual([]);
    await b.respond(group, true);
    expect(await b.myInvitations()).toEqual([]);

    await a.share({
      groupId: group,
      localId: 'dA:1',
      kind: 'deposit',
      amount: aed(5000),
      date: m1.day(5),
      note: 'x',
    });
    await b.share({
      groupId: group,
      localId: 'dB:1',
      kind: 'deposit',
      amount: aed(3000),
      date: m1.day(8),
      note: '',
    });
    await b.share({
      groupId: group,
      localId: 'dB:2',
      kind: 'withdrawal',
      amount: aed(500),
      date: m1.day(9),
      note: '',
    });

    const groups = await a.myGroups();
    expect(groups).toEqual([
      expect.objectContaining({
        groupId: group,
        name: 'Home',
        role: 'admin',
        memberCount: 2,
        entryCount: 3,
      }),
    ]);
    for (const api of [a, b]) {
      const totals = await api.totals(group, m1.first, m1.last);
      expect(totals.combined).toEqual({
        periodNet: aed(7500),
        totalNet: aed(7500),
        entriesInPeriod: 3,
        hasRecords: true,
      });
      expect(totals.members.map((x) => `${x.username}:${x.periodNet}`).sort()).toEqual([
        `alice:${aed(5000)}`,
        `bobby:${aed(2500)}`,
      ]);
      const entries = await api.entries(group);
      expect(entries).toHaveLength(3);
      expect(entries[0]!.entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // plain calendar dates
      expect((await api.members(group)).map((x) => x.username).sort()).toEqual(['alice', 'bobby']);
      expect((await api.events(group)).some((e) => e.kind === 'entry_shared')).toBe(true);
    }

    expect((await b.myShares()).map((s) => s.localId).sort()).toEqual(['dB:1', 'dB:2']);
    expect(await a.unshare('dA:1')).toBe(true);
    expect((await b.totals(group, m1.first, m1.last)).combined.totalNet).toBe(aed(2500));

    await b.leave(group);
    expect(await b.myGroups()).toEqual([]);
    expect((await a.totals(group, m1.first, m1.last)).combined.totalNet).toBe(0);
  });

  it('an admin can remove a member; a non-admin cannot invite', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const bob = await db().signUp('bob@example.com', 'bobby');
    const a = createSharingApi(alice);
    const b = createSharingApi(bob);
    const group = await a.createGroup('Home');
    await a.invite(group, 'bobby');
    await b.respond(group, true);
    expect(await refused(b.invite(group, 'alice'))).toMatch(/admin/);
    const members = await a.members(group);
    const bobId = members.find((x) => x.username === 'bobby')!.userId;
    await a.removeMember(group, bobId);
    expect(await b.myGroups()).toEqual([]);
  });

  it('every database function the app calls exists', async () => {
    const rows = await db().admin<{ proname: string }>(
      "select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'",
    );
    const have = new Set(rows.map((r) => r.proname));
    for (const name of Object.keys(RPC_SHAPES)) expect(have.has(name)).toBe(true);
  });
});
