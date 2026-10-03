import type { RpcClient } from './contract';

/** Optional details given at sign-up. They are shown to the owner only and are not used to find people. */
export interface SignUpProfile {
  fullName?: string;
  phone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'invalid_code'
  | 'email_taken'
  | 'username_taken'
  | 'weak_password'
  | 'rate_limited'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Registration, login, email verification, password reset and logout. Verification and reset use a one-time code
 * from the email that the user types into the app, so no link has to open the app.
 */
export interface AuthService {
  usernameAvailable(username: string): Promise<boolean>;
  /** Creates the account and sends a verification code. Resolves with the user when no code is needed. */
  signUp(
    email: string,
    password: string,
    username: string,
    profile?: SignUpProfile,
  ): Promise<AuthUser | 'verification-sent'>;
  verifySignUp(email: string, code: string): Promise<AuthUser>;
  resendSignUpCode(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Deletes the account and everything stored about it on the server, then signs out. */
  deleteAccount(): Promise<void>;
  /** Always resolves, whether or not the email has an account (nothing is revealed). */
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(email: string, code: string, newPassword: string): Promise<AuthUser>;
  currentUser(): Promise<AuthUser | null>;
  /** Called with the user (or null) whenever the session changes, including a session expiring. */
  onAuthChange(listener: (user: AuthUser | null) => void): () => void;
}

/** Everything the app needs from a backend. A real one (Supabase) or a test one. */
export interface Backend {
  /** Which kind of server this is: the real one, or the local test server on your computer. */
  kind: 'supabase' | 'dev-server';
  auth: AuthService;
  /** Calls the database functions as the signed-in user. */
  rpc: RpcClient;
  /** Tells the app when something changes in any group the user belongs to. Returns an unsubscribe function. */
  onGroupChange(listener: () => void): () => void;
}
