import type { RpcClient, RpcName } from './contract';
import { secureStorage } from './secureStorage';
import {
  AuthError,
  type AuthErrorCode,
  type AuthService,
  type AuthUser,
  type Backend,
} from './types';

/**
 * Connects to the LOCAL TEST SERVER (`npm run dev:server` in mobile/), which runs the real database rules on your own
 * computer. For testing accounts and shared savings on real phones without a Supabase project. The sign-in code is
 * always 123456. Not for real users.
 */
const TOKEN_KEY = 'cashflow.dev.token';
const POLL_MS = 3000;

const KNOWN_CODES: readonly AuthErrorCode[] = [
  'invalid_credentials',
  'email_not_verified',
  'invalid_code',
  'email_taken',
  'username_taken',
  'weak_password',
  'rate_limited',
  'network',
  'unknown',
];

interface Reply {
  error?: { code?: string; message?: string };
  [key: string]: unknown;
}

/** The part of `fetch` this connector uses, so a test can supply its own. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function createDevBackend(
  baseUrl: string,
  fetchImpl: FetchLike = fetch as FetchLike,
): Backend {
  const base = baseUrl.replace(/\/+$/, '');
  let token: string | null | undefined; // undefined: not read yet
  const listeners = new Set<(u: AuthUser | null) => void>();

  const getToken = async (): Promise<string | null> => {
    if (token === undefined) token = await secureStorage.getItem(TOKEN_KEY);
    return token;
  };
  const setToken = async (value: string | null) => {
    token = value;
    if (value) await secureStorage.setItem(TOKEN_KEY, value);
    else await secureStorage.removeItem(TOKEN_KEY);
  };
  const notify = (u: AuthUser | null) => listeners.forEach((l) => l(u));

  async function call(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    withToken = true,
  ): Promise<Reply> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const t = withToken ? await getToken() : null;
    if (t) headers['authorization'] = `Bearer ${t}`;
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new AuthError(
        'network',
        'Cannot reach the test server. Is it running, and is the address right?',
      );
    }
    const json = (await res.json().catch(() => ({}))) as Reply;
    if (!res.ok) {
      const code = (json.error?.code ?? 'unknown') as AuthErrorCode;
      throw new AuthError(KNOWN_CODES.includes(code) ? code : 'unknown', json.error?.message);
    }
    return json;
  }

  const session = async (path: string, body: unknown): Promise<AuthUser> => {
    const r = await call('POST', path, body, false);
    await setToken(String(r['token']));
    const user = r['user'] as AuthUser;
    notify(user);
    return user;
  };

  const auth: AuthService = {
    usernameAvailable: async (username) => {
      const r = await call(
        'POST',
        '/rpc/username_available',
        { args: { p_username: username } },
        false,
      );
      return r['data'] === true;
    },
    signUp: async (email, password, username, profile) => {
      await call(
        'POST',
        '/auth/signup',
        { email, password, username, fullName: profile?.fullName, phone: profile?.phone },
        false,
      );
      return 'verification-sent';
    },
    verifySignUp: (email, code) => session('/auth/verify', { email, code }),
    resendSignUpCode: async (email) => {
      await call('POST', '/auth/resend', { email }, false);
    },
    signIn: (email, password) => session('/auth/login', { email, password }),
    signOut: async () => {
      await call('POST', '/auth/logout', {}).catch(() => undefined);
      await setToken(null);
      notify(null);
    },
    deleteAccount: async () => {
      await call('POST', '/auth/delete', {});
      await setToken(null);
      notify(null);
    },
    requestPasswordReset: async (email) => {
      await call('POST', '/auth/reset-request', { email }, false).catch(() => undefined);
    },
    resetPassword: (email, code, password) => session('/auth/reset', { email, code, password }),
    currentUser: async () => {
      if (!(await getToken())) return null;
      try {
        return (await call('GET', '/auth/me')).user as AuthUser;
      } catch (e) {
        if (e instanceof AuthError && e.code === 'network') throw e;
        await setToken(null);
        return null;
      }
    },
    onAuthChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const rpc: RpcClient = {
    async rpc<T = unknown>(name: RpcName, args: Record<string, unknown> = {}): Promise<T> {
      try {
        const r = await call('POST', `/rpc/${name}`, { args });
        return r['data'] as T;
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : 'The test server could not be reached.');
      }
    },
  };

  return {
    kind: 'dev-server',
    auth,
    rpc,
    onGroupChange(listener) {
      // The test server has no push channel, so ask whether anything changed every few seconds.
      let last: unknown;
      const timer = setInterval(() => {
        call('GET', '/changes', undefined, false)
          .then((r) => {
            if (last !== undefined && r['version'] !== last) listener();
            last = r['version'];
          })
          .catch(() => undefined);
      }, POLL_MS);
      return () => clearInterval(timer);
    },
  };
}
