import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  createSharingApi,
  type GroupInfo,
  type Invitation,
  type SharedEntry,
  type SharingApi,
} from '../backend/sharingApi';
import { desiredShares, isEmptyPlan, planShareSync } from '../domain/shareSync';
import { useAccount } from './AccountContext';
import { usePrototype } from './PrototypeContext';

const REFRESH_EVERY_MS = 60_000;

interface SharingState {
  /** True when signed in to an account on a build that has a backend. */
  available: boolean;
  groups: GroupInfo[];
  invitations: Invitation[];
  /** The groups and invitations have been read at least once. */
  loaded: boolean;
  /** A short, plain message when the last refresh or sync failed; cleared when one succeeds. */
  error: string | null;
  api: SharingApi | null;
  /** Counts every successful refresh, so screens can reload what they show. */
  version: number;
  /** Any group the user belongs to has a shared saving: this is when the Shared Savings dashboard appears. */
  hasSharedEntries: boolean;
  refresh: () => Promise<void>;
  createGroup: (name: string) => Promise<string>;
  invite: (groupId: string, identifier: string) => Promise<void>;
  respond: (groupId: string, accept: boolean) => Promise<void>;
  leave: (groupId: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;
  /** Make a shared saving private again (owner only). Also clears the share on this phone when it came from here. */
  makePrivate: (entry: Pick<SharedEntry, 'localId'>) => Promise<void>;
  /** The id of the saving on this phone that a shared entry was made from, when it was made here. */
  localMovementId: (entry: Pick<SharedEntry, 'localId'>) => string | null;
}

const Ctx = createContext<SharingState | null>(null);

function messageOf(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
}

export function SharingProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const { plan, deviceId, makeEntriesPrivate, setEntryShare } = usePrototype();
  const backend = account.status === 'signedIn' ? account.backend : null;
  const api = useMemo(() => (backend ? createSharingApi(backend.rpc) : null), [backend]);

  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!api) return null;
    const [g, i] = await Promise.all([api.myGroups(), api.myInvitations()]);
    return { g, i };
  }, [api]);

  const apply = useCallback((r: { g: GroupInfo[]; i: Invitation[] } | null) => {
    if (!r || !alive.current) return;
    setGroups(r.g);
    setInvitations(r.i);
    setLoaded(true);
    setVersion((v) => v + 1);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await fetchAll());
    } catch (e) {
      if (alive.current) setError(messageOf(e));
    }
  }, [apply, fetchAll]);

  // The provider is keyed by account, so a new account starts from a fresh provider. Load once on mount.
  useEffect(() => {
    fetchAll()
      .then(apply)
      .catch((e) => alive.current && setError(messageOf(e)));
  }, [fetchAll, apply]);

  // Live updates, plus a slow refresh as a safety net and so retries happen after being offline.
  useEffect(() => {
    if (!backend) return;
    const off = backend.onGroupChange(() => void refresh());
    const timer = setInterval(() => void refresh(), REFRESH_EVERY_MS);
    return () => {
      off();
      clearInterval(timer);
    };
  }, [backend, refresh]);

  // Keep the shared copies in step with the savings on this phone.
  const movementsRef = useRef(plan.savings.movements);
  const groupIdsRef = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    movementsRef.current = plan.savings.movements;
    groupIdsRef.current = new Set(groups.map((g) => g.groupId));
  }, [plan.savings.movements, groups]);
  const syncing = useRef(false);
  const again = useRef(false);

  const sync = useCallback(async () => {
    if (!api || !deviceId || !loaded) return;
    if (syncing.current) {
      again.current = true;
      return;
    }
    syncing.current = true;
    try {
      do {
        again.current = false;
        const remote = await api.myShares();
        const p = planShareSync({
          desired: desiredShares(movementsRef.current, deviceId),
          remote: remote.map((r) => ({
            localId: r.localId,
            groupId: r.groupId,
            kind: r.kind,
            amount: r.amount,
            entryDate: r.entryDate,
            note: r.note,
          })),
          myGroupIds: groupIdsRef.current,
          deviceId,
        });
        if (isEmptyPlan(p)) continue;
        for (const key of p.unshares) await api.unshare(key);
        for (const d of p.upserts) {
          await api.share({
            groupId: d.groupId,
            localId: d.localId,
            kind: d.kind,
            amount: d.amount,
            date: d.date,
            note: d.note,
          });
        }
        if (p.clearLocal.length > 0 && alive.current) makeEntriesPrivate(p.clearLocal);
        if (p.upserts.length > 0 || p.unshares.length > 0) await refresh();
      } while (again.current);
      if (alive.current) setError(null);
    } catch (e) {
      if (alive.current) setError(messageOf(e));
    } finally {
      syncing.current = false;
    }
  }, [api, deviceId, loaded, makeEntriesPrivate, refresh]);

  useEffect(() => {
    // Runs whenever the savings on the phone or the user's groups change.
    const timer = setTimeout(() => void sync(), 0);
    return () => clearTimeout(timer);
  }, [sync, plan.savings.movements, groups]);

  const localMovementId = useCallback(
    (entry: Pick<SharedEntry, 'localId'>): string | null => {
      if (!deviceId) return null;
      const prefix = `${deviceId}:`;
      if (!entry.localId.startsWith(prefix)) return null;
      const id = entry.localId.slice(prefix.length);
      return plan.savings.movements.some((m) => m.id === id) ? id : null;
    },
    [deviceId, plan.savings.movements],
  );

  const value = useMemo<SharingState>(() => {
    const need = (): SharingApi => {
      if (!api) throw new Error('Sign in to use groups.');
      return api;
    };
    return {
      available: api !== null,
      groups,
      invitations,
      loaded,
      error,
      api,
      version,
      hasSharedEntries: groups.some((g) => g.entryCount > 0),
      refresh,
      async createGroup(name) {
        const id = await need().createGroup(name);
        await refresh();
        return id;
      },
      async invite(groupId, identifier) {
        await need().invite(groupId, identifier);
        await refresh();
      },
      async respond(groupId, accept) {
        await need().respond(groupId, accept);
        await refresh();
      },
      async leave(groupId) {
        await need().leave(groupId);
        await refresh();
      },
      async removeMember(groupId, userId) {
        await need().removeMember(groupId, userId);
        await refresh();
      },
      async makePrivate(entry) {
        await need().unshare(entry.localId);
        const movement = localMovementId(entry);
        if (movement) setEntryShare(movement, null);
        await refresh();
      },
      localMovementId,
    };
  }, [api, groups, invitations, loaded, error, version, refresh, localMovementId, setEntryShare]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSharing(): SharingState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSharing must be used inside SharingProvider');
  return ctx;
}
