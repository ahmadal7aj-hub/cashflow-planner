import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

import {
  aed,
  settle,
  sharedRows,
  start,
  type,
  withAccountDb,
  world,
} from '../testing/accountScenario';

const { db } = withAccountDb();

async function openAdd(getPathname: () => string) {
  await fireEvent.press(screen.getByTestId('tab-savings'));
  await fireEvent.press(screen.getByTestId('savings-add'));
  await waitFor(() => expect(getPathname()).toBe('/edit/savings-in/new'));
}

describe('Shared: link a saving to another person by username or email', () => {
  it('shows only Keep private and Shared first, and asks who with only after Shared is picked', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await openAdd(getPathname);
    expect(screen.getByTestId('share-private')).toBeTruthy();
    expect(screen.getByTestId('share-shared')).toBeTruthy();
    expect(screen.queryByTestId('input-share-person')).toBeNull();
    await fireEvent.press(screen.getByTestId('share-shared'));
    expect(screen.getByTestId('share-agreement')).toBeTruthy();
    // Alice is already in a group, so it is offered, plus someone new.
    await fireEvent.press(screen.getByTestId('share-with-__new__'));
    expect(screen.getByTestId('input-share-person')).toBeTruthy();
  });

  it('shares with a new person by username: they get an invitation and see nothing until they accept', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await openAdd(getPathname);
    await type('amount', '2500');
    await fireEvent.press(screen.getByTestId('share-shared'));
    await fireEvent.press(screen.getByTestId('share-with-__new__'));
    await type('share-person', 'Carol');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);

    const groups = await db().admin<{ name: string; id: string }>(
      "select name, id from public.groups where name = 'Shared with carol'",
    );
    expect(groups).toHaveLength(1);
    expect((await sharedRows(db())).map((r) => r.amount)).toEqual([String(aed(2500))]);

    const invites = await db().as(w.carolId).rpc<{ group_name: string }[]>('my_invitations');
    expect(invites.map((i) => i.group_name)).toEqual(['Shared with carol']);
    // Pending: Carol cannot read the entry or the totals.
    await expect(
      db().as(w.carolId).rpc('list_group_entries', { p_group: groups[0]!.id }),
    ).rejects.toThrow(/not a member/);

    // A second saving to the same person reuses the same group.
    await openAdd(getPathname);
    await type('amount', '100');
    await fireEvent.press(screen.getByTestId('share-shared'));
    await fireEvent.press(screen.getByTestId('share-with-__new__'));
    await type('share-person', 'carol');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    expect(
      await db().admin("select 1 from public.groups where name = 'Shared with carol'"),
    ).toHaveLength(1);
    expect(await sharedRows(db())).toHaveLength(2);
  });

  it('works with an email address too', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await openAdd(getPathname);
    await type('amount', '700');
    await fireEvent.press(screen.getByTestId('share-shared'));
    await fireEvent.press(screen.getByTestId('share-with-__new__'));
    await type('share-person', 'carol@example.com');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    const invites = await db().as(w.carolId).rpc<unknown[]>('my_invitations');
    expect(invites).toHaveLength(1);
  });

  it('asks for a username or email, and says phone numbers cannot be used yet, saving nothing', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await openAdd(getPathname);
    await type('amount', '300');
    await fireEvent.press(screen.getByTestId('share-shared'));
    await fireEvent.press(screen.getByTestId('share-with-__new__'));
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(screen.getByTestId('error-share-person')).toBeTruthy();
    await type('share-person', '+971 50 123 4567');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await settle(w.db);
    expect(screen.getByTestId('error-share-person').props.children).toMatch(/Phone numbers/);
    expect(getPathname()).toBe('/edit/savings-in/new');
    expect(await sharedRows(db())).toEqual([]);
  });

  it('keeping it private still saves with no group at all', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await openAdd(getPathname);
    await type('amount', '400');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(getPathname()).toBe('/savings'));
    await settle(w.db);
    expect(await sharedRows(db())).toEqual([]);
  });
});
