import type { RpcClient, RpcName } from '../backend/contract';
import {
  AuthError,
  type AuthService,
  type AuthUser,
  type Backend,
  type SignUpProfile,
} from '../backend/types';
import type { TestDb } from './db';

export const SIGNUP_CODE = '123456';
export const RESET_CODE = '654321';

interface Account {
  password: string;
  profile?: SignUpProfile;
  username: string;
  verified: boolean;
  userId: string | null;
}

/**
 * A stand-in for Supabase Authentication that runs against the real test database: when an email is verified, a real
 * auth user (and profile) is created there, and every data call runs as that user with Row Level Security on.
 * Emails are not sent: the signup code is always 123456 and the reset code 654321.
 */
export class TestBackend implements Backend {
  readonly accounts = new Map<string, Account>();
  readonly kind = 'supabase' as const;
  readonly sentCodes: { email: string; kind: 'signup' | 'reset' }[] = [];
  private session: { userId: string; email: string } | null = null;
  private authListeners = new Set<(u: AuthUser | null) => void>();
  private changeListeners = new Set<() => void>();
  rpcCalls: { name: RpcName; args: Record<string, unknown> }[] = [];
  /** Make every data call fail, to test being offline. */
  offline = false;

  constructor(private readonly db: TestDb) {}

  private emit() {
    const user = this.session ? { id: this.session.userId, email: this.session.email } : null;
    this.authListeners.forEach((l) => l(user));
  }

  /** Tell this phone that something changed in one of its groups (what Realtime does on a real backend). */
  emitGroupChange() {
    this.changeListeners.forEach((l) => l());
  }

  get userId(): string | null {
    return this.session?.userId ?? null;
  }

  readonly auth: AuthService = {
    usernameAvailable: async (username) =>
      (await this.db.as(null).rpc('username_available', { p_username: username })) === true,
    signUp: async (email, password, username, profile) => {
      const existing = this.accounts.get(email);
      if (existing?.verified) throw new AuthError('email_taken');
      this.accounts.set(email, { password, username, profile, verified: false, userId: null });
      this.sentCodes.push({ email, kind: 'signup' });
      return 'verification-sent';
    },
    verifySignUp: async (email, code) => {
      const account = this.accounts.get(email);
      if (!account || code !== SIGNUP_CODE) throw new AuthError('invalid_code');
      if (!account.userId) {
        try {
          const session = await this.db.signUp(email, account.username, account.profile);
          account.userId = session.id;
        } catch {
          throw new AuthError('username_taken');
        }
      }
      account.verified = true;
      this.session = { userId: account.userId!, email };
      this.emit();
      return { id: account.userId!, email };
    },
    resendSignUpCode: async (email) => {
      this.sentCodes.push({ email, kind: 'signup' });
    },
    signIn: async (email, password) => {
      const account = this.accounts.get(email);
      if (!account || account.password !== password) throw new AuthError('invalid_credentials');
      if (!account.verified) throw new AuthError('email_not_verified');
      this.session = { userId: account.userId!, email };
      this.emit();
      return { id: account.userId!, email };
    },
    signOut: async () => {
      this.session = null;
      this.emit();
    },
    requestPasswordReset: async (email) => {
      if (this.accounts.get(email)?.verified) this.sentCodes.push({ email, kind: 'reset' });
    },
    resetPassword: async (email, code, newPassword) => {
      const account = this.accounts.get(email);
      if (!account?.verified || code !== RESET_CODE) throw new AuthError('invalid_code');
      account.password = newPassword;
      this.session = { userId: account.userId!, email };
      this.emit();
      return { id: account.userId!, email };
    },
    currentUser: async () =>
      this.session ? { id: this.session.userId, email: this.session.email } : null,
    onAuthChange: (listener) => {
      this.authListeners.add(listener);
      return () => this.authListeners.delete(listener);
    },
  };

  readonly rpc: RpcClient = {
    rpc: async <T = unknown>(name: RpcName, args: Record<string, unknown> = {}): Promise<T> => {
      if (this.offline) throw new Error('Network request failed');
      this.rpcCalls.push({ name, args });
      return this.db.as(this.session?.userId ?? null).rpc<T>(name, args);
    },
  };

  onGroupChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** Register and verify an account directly (no screens), leaving this backend signed out. */
  async createAccount(
    email: string,
    username: string,
    password = 'a-long-password',
  ): Promise<string> {
    const session = await this.db.signUp(email, username);
    this.accounts.set(email, { password, username, verified: true, userId: session.id });
    return session.id!;
  }

  /** Sign in directly (no screens). */
  async signInAs(email: string): Promise<void> {
    const account = this.accounts.get(email)!;
    this.session = { userId: account.userId!, email };
    this.emit();
  }
}
