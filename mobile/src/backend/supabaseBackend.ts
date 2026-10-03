import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  type AuthError as SupabaseAuthError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { BackendConfig } from './config';
import type { RpcClient, RpcName } from './contract';
import {
  AuthError,
  type AuthErrorCode,
  type AuthService,
  type AuthUser,
  type Backend,
} from './types';

export function mapAuthError(
  e: SupabaseAuthError | { message: string; code?: string; status?: number },
): AuthError {
  const code = ('code' in e ? e.code : undefined) ?? '';
  const message = e.message ?? '';
  const status = 'status' in e ? e.status : undefined;
  let mapped: AuthErrorCode = 'unknown';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message))
    mapped = 'invalid_credentials';
  else if (code === 'email_not_confirmed' || /email not confirmed/i.test(message))
    mapped = 'email_not_verified';
  else if (
    code === 'otp_expired' ||
    code === 'invalid_otp' ||
    (/token has expired|invalid/i.test(message) && /token|otp|code/i.test(message))
  )
    mapped = 'invalid_code';
  else if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    /already registered/i.test(message)
  )
    mapped = 'email_taken';
  else if (code === 'weak_password') mapped = 'weak_password';
  else if (status === 429 || /rate limit|too many/i.test(message)) mapped = 'rate_limited';
  else if (/network|fetch failed|failed to fetch/i.test(message)) mapped = 'network';
  return new AuthError(mapped, message);
}

function toUser(u: { id: string; email?: string | null } | null | undefined): AuthUser | null {
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

function createAuthService(client: SupabaseClient, rpc: RpcClient): AuthService {
  const auth = client.auth;
  return {
    async usernameAvailable(username) {
      return (await rpc.rpc<boolean>('username_available', { p_username: username })) === true;
    },
    async signUp(email, password, username) {
      const { data, error } = await auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        const mapped = mapAuthError(error);
        if (/username|profiles_username/i.test(error.message))
          throw new AuthError('username_taken', error.message);
        throw mapped;
      }
      // With email confirmation switched on there is no session until the code is verified.
      return data.session && data.user
        ? { id: data.user.id, email: data.user.email ?? email }
        : 'verification-sent';
    },
    async verifySignUp(email, code) {
      const { data, error } = await auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data.user) throw error ? mapAuthError(error) : new AuthError('invalid_code');
      return { id: data.user.id, email: data.user.email ?? email };
    },
    async resendSignUpCode(email) {
      const { error } = await auth.resend({ type: 'signup', email });
      if (error) throw mapAuthError(error);
    },
    async signIn(email, password) {
      const { data, error } = await auth.signInWithPassword({ email, password });
      if (error || !data.user)
        throw error ? mapAuthError(error) : new AuthError('invalid_credentials');
      return { id: data.user.id, email: data.user.email ?? email };
    },
    async signOut() {
      const { error } = await auth.signOut();
      if (error) throw mapAuthError(error);
    },
    async requestPasswordReset(email) {
      // The result is ignored on purpose so the screen never reveals whether an account exists.
      await auth.resetPasswordForEmail(email).catch(() => undefined);
    },
    async resetPassword(email, code, newPassword) {
      const verified = await auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (verified.error || !verified.data.user)
        throw verified.error ? mapAuthError(verified.error) : new AuthError('invalid_code');
      const updated = await auth.updateUser({ password: newPassword });
      if (updated.error) throw mapAuthError(updated.error);
      return { id: verified.data.user.id, email: verified.data.user.email ?? email };
    },
    async currentUser() {
      const { data } = await auth.getSession();
      return toUser(data.session?.user);
    },
    onAuthChange(listener) {
      const { data } = auth.onAuthStateChange((_event, session) => listener(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
  };
}

/** The real backend: Supabase authentication and the shared-savings database functions. */
export function createSupabaseBackend(config: BackendConfig): Backend {
  const client = createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Keep the session fresh only while the app is in the foreground.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });

  const rpc: RpcClient = {
    async rpc<T = unknown>(name: RpcName, args: Record<string, unknown> = {}): Promise<T> {
      const { data, error } = await client.rpc(name, args);
      if (error) throw new Error(error.message);
      return data as T;
    },
  };

  return {
    kind: 'supabase',
    auth: createAuthService(client, rpc),
    rpc,
    onGroupChange(listener) {
      // Realtime only delivers rows the user may read (Row Level Security), and these rows carry no amounts.
      const channel = client
        .channel('group-events')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_events' }, () =>
          listener(),
        )
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
