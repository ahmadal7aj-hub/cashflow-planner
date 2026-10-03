import { readBackendConfig } from './config';
import { mapAuthError } from './supabaseBackend';

describe('mapping authentication errors to plain codes', () => {
  it('recognises the common cases by code or message', () => {
    expect(
      mapAuthError({ message: 'Invalid login credentials', code: 'invalid_credentials' }).code,
    ).toBe('invalid_credentials');
    expect(mapAuthError({ message: 'Email not confirmed', code: 'email_not_confirmed' }).code).toBe(
      'email_not_verified',
    );
    expect(
      mapAuthError({ message: 'Token has expired or is invalid', code: 'otp_expired' }).code,
    ).toBe('invalid_code');
    expect(mapAuthError({ message: 'User already registered' }).code).toBe('email_taken');
    expect(mapAuthError({ message: 'Password too weak', code: 'weak_password' }).code).toBe(
      'weak_password',
    );
    expect(mapAuthError({ message: 'x', status: 429 }).code).toBe('rate_limited');
    expect(mapAuthError({ message: 'Network request failed' }).code).toBe('network');
    expect(mapAuthError({ message: 'something else entirely' }).code).toBe('unknown');
  });
});

describe('reading the backend settings', () => {
  it('needs both values and an https address; the trailing slash is dropped', () => {
    expect(readBackendConfig({})).toBeNull();
    expect(readBackendConfig({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    expect(
      readBackendConfig({
        EXPO_PUBLIC_SUPABASE_URL: 'http://x.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k',
      }),
    ).toBeNull();
    expect(
      readBackendConfig({
        EXPO_PUBLIC_SUPABASE_URL: ' https://x.supabase.co/ ',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: ' key ',
      }),
    ).toEqual({ url: 'https://x.supabase.co', anonKey: 'key' });
  });
});
