import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { readBackendConfig, readDevServerUrl } from '../backend/config';
import { createDevBackend } from '../backend/devBackend';
import { createSupabaseBackend } from '../backend/supabaseBackend';
import type { AuthUser, Backend, SignUpProfile } from '../backend/types';
import { getTestBackend } from './testBackend';

export interface AccountUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone: string;
}

export type AccountStatus =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: AccountUser; cameFromSignIn: boolean };

interface AccountActions {
  signUp: (
    email: string,
    password: string,
    username: string,
    profile?: SignUpProfile,
  ) => Promise<'verification-sent' | 'signed-in'>;
  verifySignUp: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account on the server and this account's saved records on this phone, then signs out. */
  deleteAccount: (userId: string) => Promise<void>;
  requestReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  usernameAvailable: (username: string) => Promise<boolean>;
  /** Changes your own name and phone (empty clears them) and refreshes the profile. */
  updateContact: (fullName: string, phone: string) => Promise<void>;
}

export type AccountState = AccountStatus & { backend: Backend | null } & AccountActions;

const Ctx = createContext<AccountState | null>(null);

let realBackend: Backend | null | undefined;

/** The Supabase backend when this build has its settings, otherwise null (the app then runs on its own). */
function resolveBackend(): Backend | null {
  const injected = getTestBackend();
  if (injected !== undefined) return injected;
  if (realBackend === undefined) {
    const config = readBackendConfig();
    const devUrl = readDevServerUrl();
    realBackend = config ? createSupabaseBackend(config) : devUrl ? createDevBackend(devUrl) : null;
  }
  return realBackend;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [backend] = useState<Backend | null>(resolveBackend);
  const [state, setState] = useState<AccountStatus>(
    backend ? { status: 'loading' } : { status: 'unavailable' },
  );
  const alive = useRef(true);
  // True once the sign-in screen has been shown, so a later sign-in starts from the welcome page.
  const sawSignIn = useRef(false);

  const establish = useCallback(
    async (u: AuthUser | null) => {
      if (!backend) return;
      if (!u) {
        sawSignIn.current = true;
        if (alive.current) setState({ status: 'signedOut' });
        return;
      }
      let username = '';
      let fullName = '';
      let phone = '';
      try {
        const rows =
          await backend.rpc.rpc<
            { username: string; full_name: string | null; phone: string | null }[]
          >('my_profile');
        username = rows?.[0]?.username ?? '';
        fullName = rows?.[0]?.full_name ?? '';
        phone = rows?.[0]?.phone ?? '';
      } catch {
        // The profile is read again on the next start; the account still works without the label.
      }
      if (alive.current)
        setState({
          status: 'signedIn',
          user: { ...u, username, fullName, phone },
          cameFromSignIn: sawSignIn.current,
        });
    },
    [backend],
  );

  useEffect(() => {
    alive.current = true;
    if (!backend) return;
    let unsubscribe = () => {};
    backend.auth
      .currentUser()
      .then((u) => establish(u))
      .catch(() => {
        sawSignIn.current = true;
        if (alive.current) setState({ status: 'signedOut' });
      });
    unsubscribe = backend.auth.onAuthChange((u) => {
      void establish(u);
    });
    return () => {
      alive.current = false;
      unsubscribe();
    };
  }, [backend, establish]);

  const actions = useMemo<AccountActions>(() => {
    const need = (): Backend => {
      if (!backend) throw new Error('Accounts are not set up on this build.');
      return backend;
    };
    return {
      async signUp(email, password, username, profile) {
        const r = await need().auth.signUp(email, password, username, profile);
        if (r === 'verification-sent') return 'verification-sent';
        await establish(r);
        return 'signed-in';
      },
      async verifySignUp(email, code) {
        await establish(await need().auth.verifySignUp(email, code));
      },
      resendCode: (email) => need().auth.resendSignUpCode(email),
      async signIn(email, password) {
        await establish(await need().auth.signIn(email, password));
      },
      async signOut() {
        await need().auth.signOut();
        await establish(null);
      },
      async deleteAccount(userId) {
        await need().auth.deleteAccount();
        // Only after the server confirmed: this account's records and backups on this phone.
        const keys = await AsyncStorage.getAllKeys();
        const mine = keys.filter((k) => k.includes(userId));
        if (mine.length > 0) await AsyncStorage.multiRemove(mine);
        await establish(null);
      },
      requestReset: (email) => need().auth.requestPasswordReset(email),
      async resetPassword(email, code, newPassword) {
        await establish(await need().auth.resetPassword(email, code, newPassword));
      },
      usernameAvailable: (username) => need().auth.usernameAvailable(username),
      async updateContact(fullName, phone) {
        await need().rpc.rpc('update_my_contact', { p_full_name: fullName, p_phone: phone });
        const name = fullName.trim();
        const number = phone.trim();
        // Same signed-in state, with the new details (no restart of the app's screens).
        setState((prev) =>
          prev.status === 'signedIn'
            ? { ...prev, user: { ...prev.user, fullName: name, phone: number } }
            : prev,
        );
      },
    };
  }, [backend, establish]);

  const value = useMemo<AccountState>(
    () => ({ ...state, backend, ...actions }),
    [state, backend, actions],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAccount must be used inside AccountProvider');
  return ctx;
}

/** The signed-in user's id, or null when there is no account (accounts off, or signed out). */
export function useUserId(): string | null {
  const a = useAccount();
  return a.status === 'signedIn' ? a.user.id : null;
}
