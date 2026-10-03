import type { SavingsMovement } from './budgetModel';
import type { ISODate } from './dates';
import type { Fils } from './money';

/**
 * Keeps the shared copy of a saving in step with the saving on the phone. Pure.
 *
 * The phone is the source of truth for its own savings: a saving marked "shared with a group" is sent to the
 * database, and when it is edited, made private or deleted the shared copy follows. The database holds ONE record
 * per shared saving (keyed by device id + saving id), so repeating a sync can never add an amount twice.
 *
 * Only records whose key starts with this device's id are touched, so a second phone signed in to the same account
 * never removes entries that were shared from the first.
 */
export interface DesiredShare {
  localId: string;
  groupId: string;
  kind: 'deposit' | 'withdrawal';
  amount: Fils;
  date: ISODate;
  note: string;
  movementId: string;
}

export interface RemoteShare {
  localId: string;
  groupId: string;
  kind: 'deposit' | 'withdrawal';
  amount: Fils;
  entryDate: ISODate;
  note: string;
}

export interface SyncPlan {
  /** Send these (new or changed). */
  upserts: DesiredShare[];
  /** Make these private first (a saving moved to another group, or no longer shared). */
  unshares: string[];
  /** Local savings whose group is no longer available to the user; they become private on the phone. */
  clearLocal: string[];
}

export function shareKey(deviceId: string, movementId: string): string {
  return `${deviceId}:${movementId}`;
}

export function desiredShares(
  movements: readonly SavingsMovement[],
  deviceId: string,
): DesiredShare[] {
  const out: DesiredShare[] = [];
  for (const m of movements) {
    if (!m.share || (m.kind !== 'deposit' && m.kind !== 'withdrawal')) continue;
    out.push({
      localId: shareKey(deviceId, m.id),
      groupId: m.share.groupId,
      kind: m.kind,
      amount: Math.abs(m.change),
      date: m.date,
      note: m.note,
      movementId: m.id,
    });
  }
  return out;
}

export function planShareSync(input: {
  desired: readonly DesiredShare[];
  remote: readonly RemoteShare[];
  /** Groups the user is currently an accepted member of. */
  myGroupIds: ReadonlySet<string>;
  deviceId: string;
}): SyncPlan {
  const { desired, remote, myGroupIds, deviceId } = input;
  const remoteByKey = new Map(remote.map((r) => [r.localId, r]));
  const upserts: DesiredShare[] = [];
  const unshares: string[] = [];
  const clearLocal: string[] = [];
  const wanted = new Set<string>();

  for (const d of desired) {
    if (!myGroupIds.has(d.groupId)) {
      clearLocal.push(d.movementId);
      continue;
    }
    wanted.add(d.localId);
    const r = remoteByKey.get(d.localId);
    if (!r) {
      upserts.push(d);
    } else if (r.groupId !== d.groupId) {
      unshares.push(d.localId);
      upserts.push(d);
    } else if (
      r.kind !== d.kind ||
      r.amount !== d.amount ||
      r.entryDate !== d.date ||
      r.note !== d.note
    ) {
      upserts.push(d);
    }
  }

  // This device's shared copies that no longer have a shared saving behind them.
  const prefix = `${deviceId}:`;
  for (const r of remote) {
    if (r.localId.startsWith(prefix) && !wanted.has(r.localId) && !unshares.includes(r.localId)) {
      unshares.push(r.localId);
    }
  }
  return { upserts, unshares, clearLocal };
}

export function isEmptyPlan(p: SyncPlan): boolean {
  return p.upserts.length === 0 && p.unshares.length === 0 && p.clearLocal.length === 0;
}
