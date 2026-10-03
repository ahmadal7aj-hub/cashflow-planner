import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import {
  addSaving,
  aed,
  openRoute,
  personalTotal,
  settle,
  sharedRows,
  start,
  switchTo,
  type,
  withAccountDb,
  world,
} from '../testing/accountScenario';

const { db } = withAccountDb();

describe('syncing: edit, make private, delete and offline never double count', () => {
  it('editing a shared saving updates the same shared entry; making it private removes it everywhere', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    expect(await sharedRows(db())).toHaveLength(1);

    // Edit the amount from the savings list: still one shared entry, now 4,000.
    await fireEvent.press(screen.getByTestId('movement-edit-mv-1'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-edit/mv-1'));
    await type('amount', '4000');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    expect((await sharedRows(db())).map((r) => r.amount)).toEqual([String(aed(4000))]);
    expect(personalTotal().getByText('AED 4,000.00')).toBeTruthy();

    // Make it private again from the same form: it leaves the server, but stays in the personal total.
    await fireEvent.press(screen.getByTestId('movement-edit-mv-1'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-edit/mv-1'));
    expect(screen.queryByTestId('share-change-note')).toBeNull();
    await fireEvent.press(screen.getByTestId('share-private'));
    // The effect is explained before saving.
    expect(screen.getByTestId('share-change-note').props.children).toMatch(
      /disappears from the group totals/,
    );
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    expect(await sharedRows(db())).toEqual([]);
    expect(personalTotal().getByText('AED 4,000.00')).toBeTruthy();
    expect(screen.queryByTestId('movement-shared-mv-1')).toBeNull();
  });

  it('a private saving can be shared later from its edit form', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '1500');
    expect(await sharedRows(db())).toEqual([]);

    await fireEvent.press(screen.getByTestId('movement-edit-mv-1'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-edit/mv-1'));
    await fireEvent.press(screen.getByTestId('share-shared'));
    await fireEvent.press(screen.getByTestId(`share-with-${w.group}`));
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    expect((await sharedRows(db())).map((r) => r.amount)).toEqual([String(aed(1500))]);
    expect(screen.getByTestId('movement-shared-mv-1')).toBeTruthy();
  });

  it('deleting a shared saving removes its shared copy too', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    await fireEvent.press(screen.getByTestId('movement-edit-mv-1'));
    await waitFor(() => expect(getPathname()).toBe('/edit/savings-edit/mv-1'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await fireEvent.press(screen.getByTestId('edit-delete'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    expect(await sharedRows(db())).toEqual([]);
    expect(personalTotal().getByText('AED 0.00')).toBeTruthy();
  });

  it('a withdrawal can be shared and lowers the shared total', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    await addSaving(w, getPathname, '1000', { groupId: w.group, direction: 'out' });
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await fireEvent.press(screen.getByTestId('dash-section-shared'));
    await waitFor(() => expect(screen.getByTestId('shared-combined')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(screen.getByTestId('shared-combined').props.children).toBe('AED 4,000.00');
  });

  it('works offline: the saving stays on the phone and reaches the server once, when back online', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    w.backend.offline = true;
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    expect(personalTotal().getByText('AED 5,000.00')).toBeTruthy(); // saved on the phone
    expect(await sharedRows(db())).toEqual([]); // not on the server yet

    w.backend.offline = false;
    await addSaving(w, getPathname, '10'); // the next change triggers another sync
    await settle(w.db, 6);
    const rows = await sharedRows(db());
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(String(aed(5000)));
  });

  it('shared savings from another phone of the same account are shown and never removed here', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    await db()
      .as(w.aliceId)
      .rpc('share_entry', {
        p_group: w.group,
        p_local_id: 'dOTHERPHONE:mv-9',
        p_kind: 'deposit',
        p_amount: aed(700),
        p_date: w.today,
        p_note: 'from my other phone',
      });
    await addSaving(w, getPathname, '5'); // triggers a sync on this phone
    await settle(w.db, 4);
    const rows = await sharedRows(db());
    expect(rows.map((r) => r.amount).sort()).toEqual([String(aed(700)), String(aed(5000))].sort());
  });

  it('another member changes arrive without a manual action (live update)', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    await openRoute(getPathname, '/dashboard?section=shared');
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(screen.getByTestId('shared-combined').props.children).toBe('AED 5,000.00');

    // Bob shares 3,000 from his own phone; the server tells Alice's phone that the group changed.
    await db()
      .as(w.bobId)
      .rpc('share_entry', {
        p_group: w.group,
        p_local_id: 'dBOB:mv-1',
        p_kind: 'deposit',
        p_amount: aed(3000),
        p_date: w.today,
        p_note: '',
      });
    w.backend.emitGroupChange();
    await settle(w.db, 4);
    expect(screen.getByTestId('shared-combined').props.children).toBe('AED 8,000.00');
  });
});

describe('invitations and leaving, through the screens', () => {
  it('an invited person sees only the invitation until they accept; declining gives no access', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');

    // Alice starts a new group and invites Carol by username.
    await openRoute(getPathname, '/groups');
    await type('group-name', 'Family');
    await fireEvent.press(screen.getByTestId('group-create'));
    await waitFor(() => expect(getPathname()).toMatch(/^\/groups\/.+/));
    await settle(w.db);
    await type('invite-identifier', 'carol');
    await fireEvent.press(screen.getByTestId('invite-send'));
    await settle(w.db);
    expect(screen.getByTestId('invite-notice')).toBeTruthy();
    expect(screen.getByText('Invited, not accepted yet')).toBeTruthy();

    // Carol sees the invitation, no group, and no shared dashboard.
    await switchTo(w, getPathname, 'carol');
    await openRoute(getPathname, '/groups');
    await settle(w.db);
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Invited by alice')).toBeTruthy();
    expect(screen.getByText('You are not in a group yet.')).toBeTruthy();
    expect(screen.queryByTestId('dash-section-shared')).toBeNull();

    // Decline: still nothing, and the invitation is gone.
    await fireEvent.press(screen.getByTestId(/^decline-/));
    await settle(w.db);
    expect(screen.queryByText('Invited by alice')).toBeNull();
    expect(screen.getByText('You are not in a group yet.')).toBeTruthy();
  });

  it('accepting an invitation puts the group in the list', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await openRoute(getPathname, `/groups/${w.group}`);
    await settle(w.db);
    await type('invite-identifier', 'carol@example.com');
    await fireEvent.press(screen.getByTestId('invite-send'));
    await settle(w.db);

    await switchTo(w, getPathname, 'carol');
    await openRoute(getPathname, '/groups');
    await settle(w.db);
    await fireEvent.press(screen.getByTestId(`accept-${w.group}`));
    await settle(w.db);
    expect(screen.getByTestId(`group-${w.group}`)).toBeTruthy();
    expect(screen.queryByText('Invited by alice')).toBeNull();
  });

  it('leaving explains the effect first; cancelling changes nothing; confirming removes access', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    expect(await sharedRows(db())).toHaveLength(1);

    await openRoute(getPathname, `/groups/${w.group}`);
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('leave'));
    expect(screen.getByText(/becomes private again on your phone/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('leave-cancel'));
    expect(await sharedRows(db())).toHaveLength(1); // cancelling changes nothing

    await fireEvent.press(screen.getByTestId('leave'));
    await fireEvent.press(screen.getByTestId('leave-confirm'));
    await settle(w.db, 6);
    expect(await sharedRows(db())).toEqual([]);
    // Her personal records are untouched; the saving simply is not shared any more.
    await openRoute(getPathname, '/savings');
    expect(personalTotal().getByText('AED 5,000.00')).toBeTruthy();
    expect(screen.queryByTestId('movement-shared-mv-1')).toBeNull();
  });

  it('an admin removing a member takes their shared savings out of the totals', async () => {
    const w = await world(db());
    await db()
      .as(w.bobId)
      .rpc('share_entry', {
        p_group: w.group,
        p_local_id: 'dBOB:mv-1',
        p_kind: 'deposit',
        p_amount: aed(3000),
        p_date: w.today,
        p_note: '',
      });
    const { getPathname } = await start(w, 'alice');
    await openRoute(getPathname, `/groups/${w.group}`);
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('remove-bobby'));
    expect(screen.getByTestId('remove-ask')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('remove-confirm-bobby'));
    await settle(w.db, 4);
    expect(await sharedRows(db())).toEqual([]);
  });
});
