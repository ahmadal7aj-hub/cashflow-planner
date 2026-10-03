import type { ISODate } from '../domain/dates';
import type { Fils } from '../domain/money';
import type { RpcClient } from './contract';

/** Typed access to the shared-savings database functions. Amounts are integer fils, dates are plain calendar dates. */
export interface GroupInfo {
  groupId: string;
  name: string;
  role: 'admin' | 'member';
  memberCount: number;
  entryCount: number;
}

export interface Invitation {
  groupId: string;
  groupName: string;
  invitedBy: string;
  invitedAt: string;
}

export interface GroupMember {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  status: 'accepted' | 'pending';
}

export type EntryKind = 'deposit' | 'withdrawal';

export interface SharedEntry {
  id: string;
  ownerId: string;
  ownerUsername: string;
  localId: string;
  kind: EntryKind;
  amount: Fils;
  entryDate: ISODate;
  note: string;
  sharedAt: string;
}

export interface GroupEvent {
  id: number;
  occurredAt: string;
  kind: string;
  actor: string | null;
  subject: string | null;
}

export interface MyShare {
  id: string;
  groupId: string;
  localId: string;
  kind: EntryKind;
  amount: Fils;
  entryDate: ISODate;
  note: string;
}

export interface Totals {
  periodNet: Fils;
  totalNet: Fils;
  entriesInPeriod: number;
  /** False when nothing shared is dated on or before the end of the range: there is no balance to report. */
  hasRecords: boolean;
}

export interface GroupTotals {
  combined: Totals;
  members: (Totals & { memberId: string; username: string })[];
}

type Row = Record<string, unknown>;

const num = (v: unknown): number => Number(v);
const str = (v: unknown): string => String(v);

/** Dates arrive as `YYYY-MM-DD` text from the API; a Date object (from other drivers) is read in local time. */
function day(v: unknown): ISODate {
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

function totals(r: Row): Totals {
  return {
    periodNet: num(r['period_net']),
    totalNet: num(r['total_net']),
    entriesInPeriod: num(r['entries_in_period']),
    hasRecords: r['has_records'] === true,
  };
}

export function createSharingApi(client: RpcClient) {
  const rows = async (name: Parameters<RpcClient['rpc']>[0], args?: Record<string, unknown>) =>
    ((await client.rpc<Row[] | null>(name, args)) ?? []) as Row[];

  return {
    async myGroups(): Promise<GroupInfo[]> {
      return (await rows('list_my_groups')).map((r) => ({
        groupId: str(r['group_id']),
        name: str(r['name']),
        role: r['role'] === 'admin' ? 'admin' : 'member',
        memberCount: num(r['member_count']),
        entryCount: num(r['entry_count']),
      }));
    },
    async myInvitations(): Promise<Invitation[]> {
      return (await rows('my_invitations')).map((r) => ({
        groupId: str(r['group_id']),
        groupName: str(r['group_name']),
        invitedBy: str(r['invited_by_username'] ?? ''),
        invitedAt: str(r['invited_at']),
      }));
    },
    async createGroup(name: string): Promise<string> {
      return str(await client.rpc('create_group', { p_name: name }));
    },
    async invite(groupId: string, identifier: string): Promise<void> {
      await client.rpc('invite_to_group', { p_group: groupId, p_identifier: identifier });
    },
    async respond(groupId: string, accept: boolean): Promise<void> {
      await client.rpc('respond_to_invitation', { p_group: groupId, p_accept: accept });
    },
    async leave(groupId: string): Promise<void> {
      await client.rpc('leave_group', { p_group: groupId });
    },
    async removeMember(groupId: string, userId: string): Promise<void> {
      await client.rpc('remove_member', { p_group: groupId, p_user: userId });
    },
    async members(groupId: string): Promise<GroupMember[]> {
      return (await rows('list_group_members', { p_group: groupId })).map((r) => ({
        userId: str(r['user_id']),
        username: str(r['username']),
        role: r['role'] === 'admin' ? 'admin' : 'member',
        status: r['status'] === 'pending' ? 'pending' : 'accepted',
      }));
    },
    async entries(groupId: string): Promise<SharedEntry[]> {
      return (await rows('list_group_entries', { p_group: groupId })).map((r) => ({
        id: str(r['id']),
        ownerId: str(r['owner_id']),
        ownerUsername: str(r['owner_username']),
        localId: str(r['local_id']),
        kind: r['kind'] === 'withdrawal' ? 'withdrawal' : 'deposit',
        amount: num(r['amount']),
        entryDate: day(r['entry_date']),
        note: str(r['note'] ?? ''),
        sharedAt: str(r['shared_at']),
      }));
    },
    async events(groupId: string, limit = 100): Promise<GroupEvent[]> {
      return (await rows('list_group_events', { p_group: groupId, p_limit: limit })).map((r) => ({
        id: num(r['id']),
        occurredAt: str(r['occurred_at']),
        kind: str(r['kind']),
        actor: r['actor_username'] == null ? null : str(r['actor_username']),
        subject: r['subject_username'] == null ? null : str(r['subject_username']),
      }));
    },
    async totals(groupId: string, from: ISODate, to: ISODate): Promise<GroupTotals> {
      const result = await rows('group_savings_summary', {
        p_group: groupId,
        p_from: from,
        p_to: to,
      });
      const combined = result.find((r) => r['is_combined'] === true);
      return {
        combined: combined
          ? totals(combined)
          : { periodNet: 0, totalNet: 0, entriesInPeriod: 0, hasRecords: false },
        members: result
          .filter((r) => r['is_combined'] !== true)
          .map((r) => ({
            ...totals(r),
            memberId: str(r['member_id']),
            username: str(r['username']),
          })),
      };
    },
    async share(input: {
      groupId: string;
      localId: string;
      kind: EntryKind;
      amount: Fils;
      date: ISODate;
      note: string;
    }): Promise<string> {
      return str(
        await client.rpc('share_entry', {
          p_group: input.groupId,
          p_local_id: input.localId,
          p_kind: input.kind,
          p_amount: input.amount,
          p_date: input.date,
          p_note: input.note,
        }),
      );
    },
    async unshare(localId: string): Promise<boolean> {
      return (await client.rpc('unshare_entry', { p_local_id: localId })) === true;
    },
    async myShares(): Promise<MyShare[]> {
      return (await rows('list_my_shared_entries')).map((r) => ({
        id: str(r['id']),
        groupId: str(r['group_id']),
        localId: str(r['local_id']),
        kind: r['kind'] === 'withdrawal' ? 'withdrawal' : 'deposit',
        amount: num(r['amount']),
        entryDate: day(r['entry_date']),
        note: str(r['note'] ?? ''),
      }));
    },
  };
}

export type SharingApi = ReturnType<typeof createSharingApi>;
