/** @jest-environment node */
import type { UserSession } from '../testing/db';
import { aed, groupOf, refused, share, withTestDb } from '../testing/dbHarness';

const { db } = withTestDb();

/**
 * The database refuses savings dated in the future, using its own clock. So these tests build their dates from the
 * real current month: `mon(-1)` is last month, `mon(-2)` the month before, and so on.
 */
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

interface SummaryRow {
  member_id: string | null;
  username: string | null;
  is_combined: boolean;
  period_net: string;
  total_net: string;
  entries_in_period: string;
  has_records: boolean;
}

async function summary(u: UserSession, group: string, from: string, to: string) {
  const rows = await u.rpc<SummaryRow[]>('group_savings_summary', {
    p_group: group,
    p_from: from,
    p_to: to,
  });
  const combined = rows.find((r) => r.is_combined)!;
  const byName = Object.fromEntries(
    rows.filter((r) => !r.is_combined).map((r) => [r.username!, r]),
  );
  return { rows, combined, byName };
}

const fils = (n: number) => String(aed(n));
const M1 = mon(-1);
const M2 = mon(-2);

async function pair() {
  const alice = await db().signUp('alice@example.com', 'alice');
  const bob = await db().signUp('bob@example.com', 'bobby');
  const group = await groupOf(alice, [bob], 'Home');
  return { alice, bob, group };
}

describe('the shared savings example', () => {
  it('personal 7,000 (5,000 shared + 2,000 private); Shared Savings shows 8,000 in BOTH accounts', async () => {
    const { alice, bob, group } = await pair();
    // Alice saves 5,000 shared and 2,000 privately. Only the shared saving is ever sent to the database.
    await share(alice, group, 'phone-a:1', 5000, M1.day(5));
    // Bob saves 3,000 as shared savings.
    await share(bob, group, 'phone-b:1', 3000, M1.day(8));

    const forAlice = await summary(alice, group, M1.first, M1.last);
    const forBob = await summary(bob, group, M1.first, M1.last);

    // The same synchronised numbers in both accounts.
    expect(forBob.rows).toEqual(forAlice.rows);
    expect(forAlice.combined).toMatchObject({ period_net: fils(8000), total_net: fils(8000) });
    expect(forAlice.byName['alice']).toMatchObject({
      period_net: fils(5000),
      total_net: fils(5000),
    });
    expect(forAlice.byName['bobby']).toMatchObject({
      period_net: fils(3000),
      total_net: fils(3000),
    });

    // Alice's private 2,000 exists nowhere in the database, so nobody could ever see it.
    const stored = await db().admin<{ owner: string; total: string }>(
      `select p.username as owner, sum(e.amount)::text as total
       from public.shared_entries e join public.profiles p on p.id = e.owner_id group by p.username order by 1`,
    );
    expect(stored).toEqual([
      { owner: 'alice', total: fils(5000) },
      { owner: 'bobby', total: fils(3000) },
    ]);
    // Bob can read only the two shared entries.
    const bobSees = await bob.rpc<{ owner_username: string; amount: string }[]>(
      'list_group_entries',
      {
        p_group: group,
      },
    );
    expect(bobSees.map((e) => `${e.owner_username}:${e.amount}`).sort()).toEqual([
      `alice:${fils(5000)}`,
      `bobby:${fils(3000)}`,
    ]);
  });

  it('sharing is one record: sharing it again edits it, and the total is never doubled', async () => {
    const { alice, bob, group } = await pair();
    await share(alice, group, 'phone-a:1', 5000, M1.day(5));
    await share(alice, group, 'phone-a:1', 5000, M1.day(5)); // a retry
    await share(alice, group, 'phone-a:1', 5200, M1.day(5)); // an edit
    expect(
      await db().admin('select * from public.shared_entries where local_id = $1', ['phone-a:1']),
    ).toHaveLength(1);
    const s = await summary(bob, group, M1.first, M1.last);
    expect(s.combined.total_net).toBe(fils(5200));
  });
});

describe('period savings versus total savings', () => {
  it('period shows what was saved in the dates; total is cumulative to the end date', async () => {
    const { alice, group } = await pair();
    await share(alice, group, 'a:1', 10000, M2.day(10)); // before the month
    await share(alice, group, 'a:2', 2000, M1.day(12)); // during the month

    const during = await summary(alice, group, M1.first, M1.last);
    expect(during.combined).toMatchObject({
      period_net: fils(2000),
      total_net: fils(12000),
      has_records: true,
    });
    const before = await summary(alice, group, M2.first, M2.last);
    expect(before.combined).toMatchObject({ period_net: fils(10000), total_net: fils(10000) });
  });

  it('withdrawals reduce both period and total', async () => {
    const { alice, group } = await pair();
    await share(alice, group, 'a:1', 10000, M2.day(10));
    await share(alice, group, 'a:2', 2000, M1.day(12));
    await share(alice, group, 'a:3', 500, M1.day(20), 'withdrawal');
    const s = await summary(alice, group, M1.first, M1.last);
    expect(s.combined).toMatchObject({ period_net: fils(1500), total_net: fils(11500) });
  });

  it('does not invent a balance before the first shared record', async () => {
    const { alice, group } = await pair();
    await share(alice, group, 'a:1', 10000, M1.day(10));
    const earlier = await summary(alice, group, M2.first, M2.last);
    expect(earlier.combined).toMatchObject({ has_records: false, period_net: '0', total_net: '0' });
    expect(earlier.byName['alice']!.has_records).toBe(false);
  });

  it('works for any valid range: a single day, ten days, a month, two years', async () => {
    const { alice, group } = await pair();
    const old = mon(-20);
    await share(alice, group, 'a:1', 100, old.day(1));
    await share(alice, group, 'a:2', 200, mon(-3).day(15));
    await share(alice, group, 'a:3', 300, M1.day(5));
    expect((await summary(alice, group, M1.day(5), M1.day(5))).combined.period_net).toBe(fils(300));
    expect((await summary(alice, group, M1.day(1), M1.day(10))).combined.period_net).toBe(
      fils(300),
    );
    expect((await summary(alice, group, mon(-3).first, mon(-3).last)).combined.period_net).toBe(
      fils(200),
    );
    const twoYears = await summary(alice, group, mon(-24).first, M1.last);
    expect(twoYears.combined).toMatchObject({
      period_net: fils(600),
      total_net: fils(600),
      entries_in_period: '3',
    });
  });

  it('refuses a range that ends before it starts', async () => {
    const { alice, group } = await pair();
    expect(await refused(summary(alice, group, M1.day(10), M1.day(1)))).toMatch(/end date/);
  });
});

describe('only the owner can change a shared entry', () => {
  it('another member cannot edit, delete or unshare it, by function or by table', async () => {
    const { alice, bob, group } = await pair();
    await share(alice, group, 'a:1', 5000, M1.day(5));

    // Bob using the same local id only ever touches his own entries.
    expect(await bob.rpc('unshare_entry', { p_local_id: 'a:1' })).toBe(false);
    await share(bob, group, 'a:1', 1, M1.day(5)); // creates Bob's own separate entry
    const s = await summary(alice, group, M1.first, M1.last);
    expect(s.byName['alice']!.total_net).toBe(fils(5000));
    expect(s.byName['bobby']!.total_net).toBe(fils(1));

    // Direct writes to the table are not allowed for anyone, including the owner.
    for (const u of [bob, alice]) {
      expect(
        await refused(
          u.query("update public.shared_entries set amount = 1 where local_id = 'a:1'"),
        ),
      ).toMatch(/permission denied/i);
      expect(await refused(u.query('delete from public.shared_entries'))).toMatch(
        /permission denied/i,
      );
      expect(
        await refused(
          u.query(
            "insert into public.shared_entries (group_id, owner_id, local_id, kind, amount, entry_date) values ($1, $2, 'x', 'deposit', 1, $3)",
            [group, u.id, M1.day(1)],
          ),
        ),
      ).toMatch(/permission denied/i);
    }
  });

  it('an entry belongs to one group at a time', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const bob = await db().signUp('bob@example.com', 'bobby');
    const carol = await db().signUp('carol@example.com', 'carol');
    const one = await groupOf(alice, [bob], 'One');
    const two = await groupOf(alice, [carol], 'Two');
    await share(alice, one, 'a:1', 5000, M1.day(5));
    expect(await refused(share(alice, two, 'a:1', 5000, M1.day(5)))).toMatch(/another group/);
    await alice.rpc('unshare_entry', { p_local_id: 'a:1' });
    await share(alice, two, 'a:1', 5000, M1.day(5));
    expect((await summary(alice, two, M1.first, M1.last)).combined.total_net).toBe(fils(5000));
    expect((await summary(alice, one, M1.first, M1.last)).combined.total_net).toBe('0');
  });

  it('validates what is shared: positive amount, a real kind, no future date, short note', async () => {
    const { alice, group } = await pair();
    expect(await refused(share(alice, group, 'a:1', 0, M1.day(5)))).toMatch(/more than zero/);
    expect(await refused(share(alice, group, 'a:1', 10, '2999-01-01'))).toMatch(/future/);
    expect(
      await refused(
        alice.rpc('share_entry', {
          p_group: group,
          p_local_id: 'a:1',
          p_kind: 'gift',
          p_amount: 100,
          p_date: M1.day(5),
          p_note: '',
        }),
      ),
    ).toMatch(/kind/);
    await share(alice, group, 'a:2', 10, M1.day(5), 'deposit', 'x'.repeat(300));
    const rows = await alice.rpc<{ note: string }[]>('list_group_entries', { p_group: group });
    expect(rows[0]!.note).toHaveLength(140);
  });
});

describe('history: sharing an older entry, unsharing, and leaving', () => {
  it('sharing an older entry places it at its own date, so earlier shared totals can change', async () => {
    const { alice, group } = await pair();
    const old = mon(-6);
    await share(alice, group, 'a:1', 1000, M1.day(5));
    const before = await summary(alice, group, old.first, old.last);
    expect(before.combined).toMatchObject({ total_net: '0', has_records: false });

    await share(alice, group, 'a:2', 4000, old.day(10)); // an older saving, shared today
    const after = await summary(alice, group, old.first, old.last);
    expect(after.combined).toMatchObject({
      period_net: fils(4000),
      total_net: fils(4000),
      has_records: true,
    });
    // "Shared on" is kept, so the history can show when it became visible.
    const rows = await alice.rpc<{ entry_date: string; shared_at: string }[]>(
      'list_group_entries',
      {
        p_group: group,
      },
    );
    expect(rows.every((r) => Boolean(r.shared_at))).toBe(true);
  });

  it('making an entry private removes it from every member total, and the history records it without an amount', async () => {
    const { alice, bob, group } = await pair();
    await share(alice, group, 'a:1', 5000, M1.day(5));
    await share(bob, group, 'b:1', 3000, M1.day(8));
    expect(await alice.rpc('unshare_entry', { p_local_id: 'a:1' })).toBe(true);

    for (const u of [alice, bob]) {
      const s = await summary(u, group, M1.first, M1.last);
      expect(s.combined.total_net).toBe(fils(3000));
      expect(s.byName['alice']!.total_net).toBe('0');
    }
    const events = await bob.rpc<Record<string, unknown>[]>('list_group_events', {
      p_group: group,
    });
    expect(
      events.some((e) => e['kind'] === 'entry_unshared' && e['actor_username'] === 'alice'),
    ).toBe(true);
    // History never carries amounts or dates of entries.
    for (const e of events) {
      expect(Object.keys(e).sort()).toEqual([
        'actor_username',
        'id',
        'kind',
        'occurred_at',
        'subject_username',
      ]);
    }
    expect(await alice.rpc('unshare_entry', { p_local_id: 'a:1' })).toBe(false); // quiet when already private
  });

  it('leaving removes that member contribution from the group totals for all dates', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const bob = await db().signUp('bob@example.com', 'bobby');
    const carol = await db().signUp('carol@example.com', 'carol');
    const group = await groupOf(alice, [bob, carol]);
    await share(alice, group, 'a:1', 5000, M2.day(5));
    await share(bob, group, 'b:1', 3000, M1.day(8));
    await share(carol, group, 'c:1', 1000, M1.day(9));

    expect((await summary(alice, group, M1.first, M1.last)).combined.total_net).toBe(fils(9000));
    await carol.rpc('leave_group', { p_group: group });

    for (const u of [alice, bob]) {
      const s = await summary(u, group, M1.first, M1.last);
      expect(s.combined.total_net).toBe(fils(8000));
      expect(Object.keys(s.byName).sort()).toEqual(['alice', 'bobby']);
    }
    // Carol's own records are untouched on her phone (only the shared copy was removed); she can see nothing here.
    expect(await refused(summary(carol, group, M1.first, M1.last))).toMatch(/not a member/);
  });
});

describe('three or more people and several groups', () => {
  it('every member of a larger group sees the same combined total and each contribution', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const bob = await db().signUp('bob@example.com', 'bobby');
    const carol = await db().signUp('carol@example.com', 'carol');
    const dave = await db().signUp('dave@example.com', 'dave_d');
    const group = await groupOf(alice, [bob, carol, dave], 'Cousins');
    await share(alice, group, 'a:1', 1000, M1.day(1));
    await share(bob, group, 'b:1', 2000, M1.day(2));
    await share(carol, group, 'c:1', 3000, M1.day(3));
    await share(dave, group, 'd:1', 4000, M1.day(4));

    const seen = await Promise.all(
      [alice, bob, carol, dave].map((u) => summary(u, group, M1.first, M1.last)),
    );
    for (const s of seen) {
      expect(s.combined.total_net).toBe(fils(10000));
      expect(
        Object.fromEntries(Object.entries(s.byName).map(([k, v]) => [k, v.total_net])),
      ).toEqual({
        alice: fils(1000),
        bobby: fils(2000),
        carol: fils(3000),
        dave_d: fils(4000),
      });
    }
    expect(seen[1]!.rows).toEqual(seen[0]!.rows);
    expect(seen[3]!.rows).toEqual(seen[0]!.rows);
  });

  it('keeps each group records and totals separate for someone in several groups', async () => {
    const alice = await db().signUp('alice@example.com', 'alice');
    const bob = await db().signUp('bob@example.com', 'bobby');
    const carol = await db().signUp('carol@example.com', 'carol');
    const home = await groupOf(alice, [bob], 'Home');
    const trip = await groupOf(alice, [carol], 'Trip');
    await share(alice, home, 'a:1', 5000, M1.day(5));
    await share(alice, trip, 'a:2', 700, M1.day(6));
    await share(carol, trip, 'c:1', 300, M1.day(7));

    expect((await summary(alice, home, M1.first, M1.last)).combined.total_net).toBe(fils(5000));
    expect((await summary(alice, trip, M1.first, M1.last)).combined.total_net).toBe(fils(1000));
    // Bob is only in Home; Carol is only in Trip.
    expect(await refused(summary(bob, trip, M1.first, M1.last))).toMatch(/not a member/);
    expect(await refused(summary(carol, home, M1.first, M1.last))).toMatch(/not a member/);
    expect(await alice.rpc<unknown[]>('list_my_shared_entries')).toHaveLength(2);
  });
});
