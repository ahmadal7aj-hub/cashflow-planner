/**
 * The database functions the app calls, with the shape of what each returns. The app never writes to a table
 * directly; every change goes through one of these (see supabase/migrations).
 */
export type RpcShape = 'rows' | 'scalar' | 'void';

export const RPC_SHAPES = {
  username_available: 'scalar',
  my_profile: 'rows',
  update_my_contact: 'void',
  delete_my_account: 'void',
  create_group: 'scalar',
  invite_to_group: 'void',
  my_invitations: 'rows',
  respond_to_invitation: 'void',
  leave_group: 'void',
  remove_member: 'void',
  list_my_groups: 'rows',
  list_group_members: 'rows',
  list_group_entries: 'rows',
  list_group_events: 'rows',
  share_entry: 'scalar',
  unshare_entry: 'scalar',
  list_my_shared_entries: 'rows',
  group_savings_summary: 'rows',
} as const satisfies Record<string, RpcShape>;

export type RpcName = keyof typeof RPC_SHAPES;

/** Calls a database function as the signed-in user. Rows come back as arrays of objects. */
export interface RpcClient {
  rpc<T = unknown>(name: RpcName, args?: Record<string, unknown>): Promise<T>;
}
