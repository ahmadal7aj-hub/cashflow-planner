import { emptyPlan, type Plan } from './budgetModel';
import { aedToFils as aed } from './money';
import {
  addSavings,
  clearSharesForGroups,
  setMovementShare,
  setOpeningSavings,
  updateSavingsMovement,
  withdrawSavings,
} from './planOps';
import { balanceAsOf, periodSavings } from './savingsEngine';
import { desiredShares, isEmptyPlan, planShareSync, shareKey, type RemoteShare } from './shareSync';

const TODAY = '2026-10-15';

function base(): Plan {
  return setOpeningSavings(
    { ...emptyPlan(), setupDone: true },
    aed(5000),
    '2026-10-01',
    '2026-10-01',
  );
}

describe('sharing a saving never changes anyone balance', () => {
  it('the personal total is the same whether a saving is shared or private', () => {
    // 5,000 shared with a group and 2,000 kept private.
    const shared5000 = addSavings(base(), aed(5000), '2026-10-05', '', TODAY, 'g1');
    if (!shared5000.ok) throw new Error('setup');
    const both = addSavings(shared5000.plan, aed(2000), '2026-10-06', '', TODAY);
    if (!both.ok) throw new Error('setup');
    // Everything private, for comparison.
    const priv5000 = addSavings(base(), aed(5000), '2026-10-05', '', TODAY);
    if (!priv5000.ok) throw new Error('setup');
    const allPrivate = addSavings(priv5000.plan, aed(2000), '2026-10-06', '', TODAY);
    if (!allPrivate.ok) throw new Error('setup');

    // The personal savings total is 5,000 opening + 7,000, shared flag or not.
    expect(balanceAsOf(both.plan.savings, TODAY)).toBe(aed(12000));
    expect(balanceAsOf(allPrivate.plan.savings, TODAY)).toBe(aed(12000));
    expect(periodSavings(both.plan.savings, '2026-10-01', '2026-10-31')).toBe(aed(7000));
    // Only one of the two savings carries a share; the other stays private.
    expect(both.plan.savings.movements.filter((m) => m.share)).toHaveLength(1);
  });

  it('sharing and un-sharing an existing saving changes only the flag', () => {
    const r = addSavings(base(), aed(3000), '2026-10-05', 'x', TODAY);
    if (!r.ok) throw new Error('setup');
    const id = r.plan.savings.movements[0]!.id;
    const shared = setMovementShare(r.plan, id, 'g1', TODAY);
    expect(shared.savings.movements[0]!.share).toEqual({ groupId: 'g1' });
    expect(balanceAsOf(shared.savings, TODAY)).toBe(balanceAsOf(r.plan.savings, TODAY));
    const priv = setMovementShare(shared, id, null, TODAY);
    expect(priv.savings.movements[0]!.share).toBeUndefined();
    expect(JSON.stringify(priv.savings)).toBe(JSON.stringify(r.plan.savings));
  });

  it('month results and corrections cannot be shared', () => {
    let p = base();
    p = {
      ...p,
      savings: {
        ...p.savings,
        movements: [
          {
            id: 'close-2026-09',
            date: '2026-09-30',
            kind: 'month-close',
            change: 100,
            note: '',
            month: '2026-09',
          },
        ],
      },
    };
    expect(setMovementShare(p, 'close-2026-09', 'g1', TODAY)).toBe(p);
  });

  it('leaving a group makes the savings shared with it private again on the phone, keeping the records', () => {
    const r1 = addSavings(base(), aed(1000), '2026-10-05', '', TODAY, 'gone');
    if (!r1.ok) throw new Error('setup');
    const r2 = addSavings(r1.plan, aed(500), '2026-10-06', '', TODAY, 'kept');
    if (!r2.ok) throw new Error('setup');
    const cleared = clearSharesForGroups(r2.plan, ['gone'], TODAY);
    expect(cleared.savings.movements.map((m) => m.share?.groupId)).toEqual([undefined, 'kept']);
    expect(balanceAsOf(cleared.savings, TODAY)).toBe(aed(6500));
  });
});

describe('editing a saving', () => {
  it('changes amount, date, note and group together, and the balance follows', () => {
    const r = addSavings(base(), aed(1000), '2026-10-05', 'old', TODAY);
    if (!r.ok) throw new Error('setup');
    const id = r.plan.savings.movements[0]!.id;
    const e = updateSavingsMovement(
      r.plan,
      id,
      { amount: aed(1500), date: '2026-10-07', note: ' new ', groupId: 'g1' },
      TODAY,
    );
    if (!e.ok) throw new Error('edit failed');
    expect(e.plan.savings.movements[0]).toMatchObject({
      change: aed(1500),
      date: '2026-10-07',
      note: 'new',
      share: { groupId: 'g1' },
    });
    expect(balanceAsOf(e.plan.savings, TODAY)).toBe(aed(6500));
  });

  it('keeps a withdrawal a withdrawal, and refuses an edit that overdraws savings', () => {
    const w = withdrawSavings(base(), aed(1000), '2026-10-05', '', TODAY);
    if (!w.ok) throw new Error('setup');
    const id = w.plan.savings.movements[0]!.id;
    const ok = updateSavingsMovement(
      w.plan,
      id,
      { amount: aed(2000), date: '2026-10-05', note: '', groupId: null },
      TODAY,
    );
    expect(ok.ok && ok.plan.savings.movements[0]!.change).toBe(-aed(2000));
    const bad = updateSavingsMovement(
      w.plan,
      id,
      { amount: aed(9000), date: '2026-10-05', note: '', groupId: null },
      TODAY,
    );
    expect(bad).toEqual({ ok: false, reason: 'insufficient' });
  });

  it('rejects zero, a date before the balance began, and a future date', () => {
    const r = addSavings(base(), aed(1000), '2026-10-05', '', TODAY);
    if (!r.ok) throw new Error('setup');
    const id = r.plan.savings.movements[0]!.id;
    const f = { amount: aed(10), date: '2026-10-05', note: '', groupId: null };
    expect(updateSavingsMovement(r.plan, id, { ...f, amount: 0 }, TODAY)).toEqual({
      ok: false,
      reason: 'amount',
    });
    expect(updateSavingsMovement(r.plan, id, { ...f, date: '2026-09-01' }, TODAY)).toEqual({
      ok: false,
      reason: 'before-opening',
    });
    expect(updateSavingsMovement(r.plan, id, { ...f, date: '2026-12-01' }, TODAY)).toEqual({
      ok: false,
      reason: 'future',
    });
    expect(updateSavingsMovement(r.plan, 'nope', f, TODAY)).toEqual({
      ok: false,
      reason: 'not-editable',
    });
  });
});

describe('keeping the shared copy in step with the phone', () => {
  const device = 'phoneA';
  const groups = new Set(['g1', 'g2']);

  function plan(): Plan {
    const a = addSavings(base(), aed(5000), '2026-10-05', 'five', TODAY, 'g1');
    if (!a.ok) throw new Error('setup');
    return a.plan;
  }

  it('sends a newly shared saving once', () => {
    const desired = desiredShares(plan().savings.movements, device);
    expect(desired).toHaveLength(1);
    expect(desired[0]).toMatchObject({
      localId: shareKey(device, 'mv-1'),
      amount: aed(5000),
      kind: 'deposit',
    });
    const first = planShareSync({ desired, remote: [], myGroupIds: groups, deviceId: device });
    expect(first.upserts).toHaveLength(1);

    const remote: RemoteShare[] = [
      {
        localId: desired[0]!.localId,
        groupId: 'g1',
        kind: 'deposit',
        amount: aed(5000),
        entryDate: '2026-10-05',
        note: 'five',
      },
    ];
    const again = planShareSync({ desired, remote, myGroupIds: groups, deviceId: device });
    expect(isEmptyPlan(again)).toBe(true); // repeating a sync adds nothing
  });

  it('sends an edit, a changed date or note, and a withdrawal as a withdrawal', () => {
    const desired = desiredShares(plan().savings.movements, device);
    const remote: RemoteShare[] = [
      {
        localId: desired[0]!.localId,
        groupId: 'g1',
        kind: 'deposit',
        amount: aed(4000),
        entryDate: '2026-10-05',
        note: 'five',
      },
    ];
    expect(
      planShareSync({ desired, remote, myGroupIds: groups, deviceId: device }).upserts,
    ).toHaveLength(1);
    const w = withdrawSavings(plan(), aed(100), '2026-10-06', '', TODAY, 'g1');
    if (!w.ok) throw new Error('setup');
    const d2 = desiredShares(w.plan.savings.movements, device);
    expect(d2.find((d) => d.kind === 'withdrawal')).toMatchObject({ amount: aed(100) });
  });

  it('makes the shared copy private when the saving is made private or deleted', () => {
    const remote: RemoteShare[] = [
      {
        localId: shareKey(device, 'mv-1'),
        groupId: 'g1',
        kind: 'deposit',
        amount: aed(5000),
        entryDate: '2026-10-05',
        note: 'five',
      },
    ];
    const privatePlan = setMovementShare(plan(), 'mv-1', null, TODAY);
    const p = planShareSync({
      desired: desiredShares(privatePlan.savings.movements, device),
      remote,
      myGroupIds: groups,
      deviceId: device,
    });
    expect(p.unshares).toEqual([shareKey(device, 'mv-1')]);
    // Deleted entirely: nothing desired any more.
    expect(
      planShareSync({ desired: [], remote, myGroupIds: groups, deviceId: device }).unshares,
    ).toEqual([shareKey(device, 'mv-1')]);
  });

  it('moving a saving to another group makes it private in the old one first', () => {
    const moved = setMovementShare(plan(), 'mv-1', 'g2', TODAY);
    const remote: RemoteShare[] = [
      {
        localId: shareKey(device, 'mv-1'),
        groupId: 'g1',
        kind: 'deposit',
        amount: aed(5000),
        entryDate: '2026-10-05',
        note: 'five',
      },
    ];
    const p = planShareSync({
      desired: desiredShares(moved.savings.movements, device),
      remote,
      myGroupIds: groups,
      deviceId: device,
    });
    expect(p.unshares).toEqual([shareKey(device, 'mv-1')]);
    expect(p.upserts[0]!.groupId).toBe('g2');
  });

  it('never touches shared copies that came from another phone', () => {
    const remote: RemoteShare[] = [
      {
        localId: 'phoneB:mv-1',
        groupId: 'g1',
        kind: 'deposit',
        amount: aed(900),
        entryDate: '2026-10-01',
        note: '',
      },
    ];
    const p = planShareSync({ desired: [], remote, myGroupIds: groups, deviceId: device });
    expect(p.unshares).toEqual([]);
  });

  it('turns a saving private on the phone when its group is no longer available', () => {
    const desired = desiredShares(plan().savings.movements, device);
    const p = planShareSync({
      desired,
      remote: [],
      myGroupIds: new Set(['other']),
      deviceId: device,
    });
    expect(p.clearLocal).toEqual(['mv-1']);
    expect(p.upserts).toEqual([]);
  });
});
