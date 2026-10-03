import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { formatDate } from '../domain/dates';
import { monthDay } from '../testing/accountsApp';
import {
  aed,
  openRoute,
  settle,
  sharedRows,
  start,
  switchTo,
  type,
  withAccountDb,
  world,
  type World,
} from '../testing/accountScenario';
import { groupOf } from '../testing/dbHarness';

const { db } = withAccountDb();

async function put(
  w: World,
  who: 'alice' | 'bob' | 'carol',
  localId: string,
  amountAed: number,
  date: string,
  kind: 'deposit' | 'withdrawal' = 'deposit',
  group = w.group,
) {
  const id = { alice: w.aliceId, bob: w.bobId, carol: w.carolId }[who];
  await db()
    .as(id)
    .rpc('share_entry', {
      p_group: group,
      p_local_id: localId,
      p_kind: kind,
      p_amount: aed(amountAed),
      p_date: date,
      p_note: '',
    });
}

/** Alice saved 10,000 two months ago and 2,000 this month; Bob saved 3,000 last month. */
async function history() {
  const w = await world(db());
  await put(w, 'alice', 'dA:1', 10000, monthDay(-2, 10, w.today));
  await put(w, 'alice', 'dA:2', 2000, monthDay(0, 1, w.today));
  await put(w, 'bob', 'dB:1', 3000, monthDay(-1, 15, w.today));
  return w;
}

const shown = () => screen.getByTestId('srange-shown').props.children as string;
const combined = () => screen.getByTestId('shared-combined').props.children as string;

async function openShared(w: World) {
  const app = await start(w, 'alice');
  await openRoute(app.getPathname, '/shared');
  await settle(w.db);
  return app;
}

describe('the Shared Savings dashboard has the same date filters as the personal one', () => {
  it('defaults to this month, shows the dates, and offers every preset and a custom range', async () => {
    const w = await history();
    await openShared(w);
    const month = `Showing ${formatDate(monthDay(0, 1, w.today))} to `;
    expect(shown().startsWith(month)).toBe(true);
    for (const id of [
      'current-month',
      'last-week',
      'last-month',
      'last-quarter',
      'last-year',
      'custom',
    ]) {
      expect(screen.getByTestId(`srange-${id}`)).toBeTruthy();
    }
    expect(screen.getByLabelText('This month')).toBeTruthy();
    expect(screen.getByLabelText('Custom date range')).toBeTruthy();
    expect(screen.getByLabelText('Last quarter')).toBeTruthy();
  });

  it('this month: period savings are what was added this month; total is the cumulative balance', async () => {
    const w = await history();
    await openShared(w);
    expect(screen.getByLabelText('This month’s savings')).toBeTruthy();
    expect(combined()).toBe('+AED 2,000.00'); // only Alice's saving dated this month
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(combined()).toBe('AED 15,000.00'); // 10,000 + 3,000 + 2,000
    expect(screen.getByText(/Cumulative shared balance at the end of/)).toBeTruthy();
  });

  it('last month: that month and the balance at the end of that month, not today', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-last-month'));
    await settle(w.db);
    expect(screen.getByLabelText('Period savings')).toBeTruthy();
    expect(combined()).toBe('+AED 3,000.00'); // Bob's saving
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(combined()).toBe('AED 13,000.00'); // 10,000 + 3,000; this month's 2,000 had not happened yet
    // History follows the dates: only Bob's last-month saving is listed.
    expect(screen.getAllByTestId(/^entry-/)).toHaveLength(1);
    expect(screen.getByTestId('entry-dB:1')).toBeTruthy();
  });

  it('the people and their contributions follow the chosen dates too', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-last-month'));
    await settle(w.db);
    const members = within(screen.getByTestId('shared-members'));
    expect(members.getByLabelText('alice (you): AED 0.00')).toBeTruthy();
    expect(members.getByLabelText('bobby: +AED 3,000.00')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(
      within(screen.getByTestId('shared-members')).getByLabelText('alice (you): AED 10,000.00'),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('shared-members')).getByLabelText('bobby: AED 3,000.00'),
    ).toBeTruthy();
  });

  it('a custom range of ten days works', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-custom'));
    await type('srange-from', monthDay(-2, 8, w.today));
    await type('srange-to', monthDay(-2, 17, w.today));
    await settle(w.db);
    expect(shown()).toBe(
      `Showing ${formatDate(monthDay(-2, 8, w.today))} to ${formatDate(monthDay(-2, 17, w.today))}`,
    );
    expect(combined()).toBe('+AED 10,000.00');
  });

  it('a custom range covering two years includes everything in it', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-custom'));
    await type('srange-from', monthDay(-24, 1, w.today));
    await type('srange-to', w.today);
    await settle(w.db);
    expect(combined()).toBe('+AED 15,000.00');
    expect(screen.getAllByTestId(/^entry-/)).toHaveLength(3);
  });

  it('a specific month such as January 2026 works, and says so when nothing was shared yet', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-custom'));
    await type('srange-from', '2026-01-01');
    await type('srange-to', '2026-01-31');
    await settle(w.db);
    expect(shown()).toBe('Showing 1 Jan 2026 to 31 Jan 2026');
    expect(combined()).toBe('AED 0.00');
    await fireEvent.press(screen.getByTestId('sview-total'));
    // Nothing was shared on or before that date: no balance is invented.
    expect(screen.getByTestId('shared-no-records')).toBeTruthy();
    expect(screen.queryByTestId('shared-combined')).toBeNull();
    expect(screen.getByTestId('shared-no-entries')).toBeTruthy();
  });

  it('a range that ends before it starts explains the problem', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-custom'));
    await type('srange-from', monthDay(-1, 20, w.today));
    await type('srange-to', monthDay(-1, 10, w.today));
    await settle(w.db);
    expect(screen.getByTestId('srange-error').props.children).toBe(
      'The end date cannot be before the start date.',
    );
  });

  it('changing the dates never changes the recorded entries', async () => {
    const w = await history();
    await openShared(w);
    const before = JSON.stringify(await sharedRows(db()));
    for (const id of ['last-week', 'last-quarter', 'last-year', 'custom', 'current-month']) {
      await fireEvent.press(screen.getByTestId(`srange-${id}`));
    }
    await settle(w.db);
    expect(JSON.stringify(await sharedRows(db()))).toBe(before);
  });
});

describe('older entries, making private, and group changes keep reports honest', () => {
  it('sharing an older saving places it at its own date, so an earlier period now includes it', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-last-month'));
    await settle(w.db);
    expect(combined()).toBe('+AED 3,000.00');

    await put(w, 'bob', 'dB:2', 700, monthDay(-1, 3, w.today)); // an older saving shared today
    w.backend.emitGroupChange();
    await settle(w.db, 4);
    expect(combined()).toBe('+AED 3,700.00'); // the earlier period changed, as explained to the user
    expect(screen.getAllByText(/Shared on/).length).toBeGreaterThan(0);
  });

  it('making an entry private removes it from the totals of every member for all dates', async () => {
    const w = await history();
    const { getPathname } = await openShared(w);
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(combined()).toBe('AED 15,000.00');

    // Bob makes his own entry private from his account.
    await switchTo(w, getPathname, 'bob');
    await openRoute(getPathname, '/shared');
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('srange-last-month')); // Bob's saving is dated last month
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('private-dB:1'));
    expect(screen.getByTestId('private-ask')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('private-confirm-dB:1'));
    await settle(w.db, 4);

    await switchTo(w, getPathname, 'alice');
    await openRoute(getPathname, '/shared');
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(combined()).toBe('AED 12,000.00'); // Bob's 3,000 is gone for Alice too
    await fireEvent.press(screen.getByTestId('srange-last-month'));
    await settle(w.db);
    expect(combined()).toBe('AED 10,000.00');
    // The group history records that it happened, without an amount.
    expect(screen.queryByText(/3,000/)).toBeNull();
  });

  it('only the owner sees Edit and Make private; other members see the entry read-only', async () => {
    const w = await history();
    await openShared(w);
    await fireEvent.press(screen.getByTestId('srange-custom'));
    await type('srange-from', monthDay(-24, 1, w.today));
    await type('srange-to', w.today);
    await settle(w.db);
    expect(screen.getByTestId('private-dA:1')).toBeTruthy(); // her own
    expect(screen.queryByTestId('private-dB:1')).toBeNull(); // Bob's: no controls
    expect(screen.queryByTestId('edit-dB:1')).toBeNull();
  });

  it('another member cannot change an entry even by trying the call directly', async () => {
    const w = await history();
    expect(await db().as(w.bobId).rpc('unshare_entry', { p_local_id: 'dA:1' })).toBe(false);
    expect(await sharedRows(db())).toHaveLength(3);
  });
});

describe('groups with three or more people, and several groups at once', () => {
  it('all three members see the same combined total and each contribution', async () => {
    const w = await world(db());
    await groupOf(db().as(w.aliceId), [db().as(w.carolId)], 'Trip'); // Carol joins another group, not Home
    await db().as(w.aliceId).rpc('invite_to_group', { p_group: w.group, p_identifier: 'carol' });
    await db().as(w.carolId).rpc('respond_to_invitation', { p_group: w.group, p_accept: true });
    await put(w, 'alice', 'dA:1', 1000, monthDay(0, 1, w.today));
    await put(w, 'bob', 'dB:1', 2000, monthDay(0, 1, w.today));
    await put(w, 'carol', 'dC:1', 4000, monthDay(0, 1, w.today));

    const app = await start(w, 'alice');
    const seen: string[] = [];
    for (const who of ['alice', 'bob', 'carol'] as const) {
      if (who !== 'alice') await switchTo(w, app.getPathname, who);
      await openRoute(app.getPathname, '/shared');
      await settle(w.db);
      // Carol belongs to two groups, so pick Home explicitly.
      if (screen.queryByTestId(`sgroup-${w.group}`))
        await fireEvent.press(screen.getByTestId(`sgroup-${w.group}`));
      await fireEvent.press(screen.getByTestId('sview-total'));
      seen.push(combined());
      const members = within(screen.getByTestId('shared-members'));
      expect(members.getByLabelText(/^alice/)).toBeTruthy();
      expect(members.getByLabelText(/^bobby/)).toBeTruthy();
      expect(members.getByLabelText(/^carol/)).toBeTruthy();
    }
    expect(seen).toEqual(['AED 7,000.00', 'AED 7,000.00', 'AED 7,000.00']);
  });

  it('someone in two groups sees each group records and totals separately', async () => {
    const w = await world(db());
    const trip = await groupOf(db().as(w.aliceId), [db().as(w.carolId)], 'Trip');
    await put(w, 'alice', 'dA:1', 5000, monthDay(0, 1, w.today), 'deposit', w.group);
    await put(w, 'alice', 'dA:2', 700, monthDay(0, 1, w.today), 'deposit', trip);
    await put(w, 'carol', 'dC:1', 300, monthDay(0, 1, w.today), 'deposit', trip);

    await start(w, 'alice');
    await waitFor(() => expect(screen.getByTestId('tab-shared')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('tab-shared'));
    await settle(w.db);
    // Both groups are listed as separate choices.
    expect(screen.getByTestId(`sgroup-${w.group}`)).toBeTruthy();
    expect(screen.getByTestId(`sgroup-${trip}`)).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`sgroup-${w.group}`));
    await fireEvent.press(screen.getByTestId('sview-total'));
    await settle(w.db);
    expect(combined()).toBe('AED 5,000.00');
    expect(screen.queryByText(/carol/)).toBeNull();

    await fireEvent.press(screen.getByTestId(`sgroup-${trip}`));
    await settle(w.db);
    expect(combined()).toBe('AED 1,000.00');
    expect(screen.getByTestId('shared-members')).toBeTruthy();
  });
});
