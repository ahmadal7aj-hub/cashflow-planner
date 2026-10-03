import { startTestDb, type TestDb, type UserSession } from './db';

/** Shared setup for the database tests: one fresh database per file, emptied before each test. */
export function useTestDb(): { db: () => TestDb } {
  let current: TestDb;
  beforeAll(async () => {
    current = await startTestDb();
  }, 90_000);
  afterAll(async () => {
    await current.close();
  });
  beforeEach(async () => {
    await current.admin(
      'truncate public.group_events, public.shared_entries, public.group_members, public.groups, public.profiles, auth.users restart identity cascade',
    );
  });
  return { db: () => current };
}

/** Resolves with the error message when the database refuses something; fails the test if it does not. */
export async function refused(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the database to refuse this');
}

export interface Member {
  id: string;
  username: string;
}

export async function who(u: UserSession): Promise<Member> {
  const rows = await u.rpc<Member[]>('my_profile');
  return { id: rows[0]!.id, username: rows[0]!.username };
}

/** Create a group owned by `owner`, invite each person by username, and have them all accept. */
export async function groupOf(owner: UserSession, others: UserSession[], name = 'Family') {
  const groupId = await owner.rpc<string>('create_group', { p_name: name });
  for (const o of others) {
    const { username } = await who(o);
    await owner.rpc('invite_to_group', { p_group: groupId, p_identifier: username });
    await o.rpc('respond_to_invitation', { p_group: groupId, p_accept: true });
  }
  return groupId;
}

export const aed = (n: number) => Math.round(n * 100);

/** Share a saving the way the app does. */
export function share(
  u: UserSession,
  group: string,
  localId: string,
  amountAed: number,
  date: string,
  kind: 'deposit' | 'withdrawal' = 'deposit',
  note = '',
) {
  return u.rpc<string>('share_entry', {
    p_group: group,
    p_local_id: localId,
    p_kind: kind,
    p_amount: aed(amountAed),
    p_date: date,
    p_note: note,
  });
}
