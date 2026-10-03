import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import {
  addSaving,
  aed,
  personalTotal,
  settle,
  sharedRows,
  start,
  switchTo,
  withAccountDb,
  world,
} from '../testing/accountScenario';

const { db } = withAccountDb();

describe('the shared savings example, across two separate accounts', () => {
  it('Alice 5,000 shared + 2,000 private (personal 7,000); Bob 3,000 shared; both see 8,000; privacy holds', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');

    // Alice: AED 5,000 shared with the group, AED 2,000 private.
    await addSaving(w, getPathname, '5000', { groupId: w.group });
    await addSaving(w, getPathname, '2000');
    expect(personalTotal().getByText('AED 7,000.00')).toBeTruthy(); // her personal total
    expect(await sharedRows(db())).toEqual([
      expect.objectContaining({ owner: 'alice', amount: String(aed(5000)) }),
    ]); // only the shared one reached the server

    // A Shared Savings dashboard appears for Alice with only the shared 5,000.
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await waitFor(() => expect(screen.getByTestId('dash-section-shared')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await fireEvent.press(screen.getByTestId('dash-section-shared'));
    await waitFor(() => expect(screen.getByTestId('shared-combined')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(screen.getByTestId('shared-combined').props.children).toBe('AED 5,000.00');

    // Bob signs in on his own account. He has not shared anything, but the group now has a shared saving.
    await switchTo(w, getPathname, 'bob');
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await waitFor(() => expect(screen.getByTestId('dash-section-shared')).toBeTruthy());

    // Bob's personal savings are his own: none of Alice's money is in them.
    await fireEvent.press(screen.getByTestId('tab-savings'));
    expect(personalTotal().getByText('AED 0.00')).toBeTruthy();

    // Bob shares AED 3,000.
    await addSaving(w, getPathname, '3000', { groupId: w.group });
    expect(personalTotal().getByText('AED 3,000.00')).toBeTruthy(); // not 8,000, not 10,000

    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await fireEvent.press(screen.getByTestId('dash-section-shared'));
    await waitFor(() => expect(screen.getByTestId('shared-combined')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(screen.getByTestId('shared-combined').props.children).toBe('AED 8,000.00');
    const members = within(screen.getByTestId('shared-members'));
    expect(members.getByLabelText('alice: AED 5,000.00')).toBeTruthy();
    expect(members.getByLabelText('bobby (you): AED 3,000.00')).toBeTruthy();
    // Alice's private 2,000 and her personal total 7,000 are nowhere in Bob's account.
    expect(screen.queryByText(/7,000/)).toBeNull();
    expect(screen.queryByText(/2,000\.00/)).toBeNull();
    expect(screen.getAllByTestId(/^entry-/)).toHaveLength(2); // only the two shared savings are listed

    // Back to Alice: the same combined 8,000, and her personal total is still 7,000.
    await switchTo(w, getPathname, 'alice');
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    await fireEvent.press(screen.getByTestId('dash-section-shared'));
    await waitFor(() => expect(screen.getByTestId('shared-combined')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('sview-total'));
    expect(screen.getByTestId('shared-combined').props.children).toBe('AED 8,000.00');
    await fireEvent.press(screen.getByTestId('tab-savings'));
    expect(personalTotal().getByText('AED 7,000.00')).toBeTruthy();
    // The server holds exactly the two shared entries: nothing was duplicated by signing in and out.
    expect((await sharedRows(db())).map((r) => `${r.owner}:${r.amount}`).sort()).toEqual([
      `alice:${aed(5000)}`,
      `bobby:${aed(3000)}`,
    ]);
  });

  it('a person who is not in the group cannot see its shared savings', async () => {
    const w = await world(db());
    const { getPathname } = await start(w, 'alice');
    await addSaving(w, getPathname, '5000', { groupId: w.group });

    await switchTo(w, getPathname, 'carol'); // registered, but never invited
    await settle(w.db);
    await fireEvent.press(screen.getByTestId('tab-dashboard'));
    expect(screen.queryByTestId('dash-section-shared')).toBeNull();
    await fireEvent.press(screen.getByTestId('tab-savings'));
    expect(personalTotal().getByText('AED 0.00')).toBeTruthy();
  });
});
