/**
 * Checks for registration and login forms. Pure. These give fast, friendly messages; the database and the
 * authentication service enforce the same rules on their side.
 */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 72;

export type UsernameProblem = 'empty' | 'length' | 'characters';
export type EmailProblem = 'empty' | 'invalid';
export type PasswordProblem = 'empty' | 'short' | 'long' | 'same-as-email' | 'same-as-username';

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameProblem(input: string): UsernameProblem | null {
  const u = normalizeUsername(input);
  if (u === '') return 'empty';
  if (u.length < 3 || u.length > 20) return 'length';
  if (!USERNAME_PATTERN.test(u)) return 'characters';
  return null;
}

export function emailProblem(input: string): EmailProblem | null {
  const e = normalizeEmail(input);
  if (e === '') return 'empty';
  // Deliberately simple: one @, something either side, a dot in the domain, no spaces.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'invalid';
  return null;
}

export function passwordProblem(
  password: string,
  context: { email?: string; username?: string } = {},
): PasswordProblem | null {
  if (password === '') return 'empty';
  if (password.length < MIN_PASSWORD_LENGTH) return 'short';
  if (password.length > MAX_PASSWORD_LENGTH) return 'long';
  if (context.email && password.toLowerCase() === normalizeEmail(context.email))
    return 'same-as-email';
  if (context.username && password.toLowerCase() === normalizeUsername(context.username))
    return 'same-as-username';
  return null;
}

/** The six-digit code from the email. Digits only; spaces are ignored. */
export function normalizeCode(input: string): string {
  return input.replace(/\s+/g, '');
}

export function codeProblem(input: string): 'empty' | 'invalid' | null {
  const c = normalizeCode(input);
  if (c === '') return 'empty';
  return /^\d{6,10}$/.test(c) ? null : 'invalid';
}

export const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;
export const MAX_NAME_LENGTH = 80;

/** A display name is optional: empty is fine, otherwise at most 80 characters. */
export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}
export function nameProblem(input: string): 'length' | null {
  return normalizeName(input).length > MAX_NAME_LENGTH ? 'length' : null;
}

/** A phone number is optional: empty is fine, otherwise digits with an optional leading + (6 to 20 characters). */
export function normalizePhone(input: string): string {
  return input.trim();
}
export function phoneProblem(input: string): 'invalid' | null {
  const p = normalizePhone(input);
  return p === '' || PHONE_PATTERN.test(p) ? null : 'invalid';
}
