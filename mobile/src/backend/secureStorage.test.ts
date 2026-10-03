import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { secureStorage } from './secureStorage';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(async () => {
  store.clear();
  await AsyncStorage.clear();
});

describe('the sign-in session is kept in secure storage', () => {
  it('stores a short value and reads it back, with nothing in plain storage', async () => {
    await secureStorage.setItem('sb-abc-auth-token', 'hello');
    expect(await secureStorage.getItem('sb-abc-auth-token')).toBe('hello');
    expect(await AsyncStorage.getItem('sb-abc-auth-token')).toBeNull();
    expect(store.size).toBeGreaterThan(0);
  });

  it('splits a long session (over the size limit of one value) and joins it again exactly', async () => {
    const long = JSON.stringify({ token: 'x'.repeat(5000), user: { id: 'é1' } });
    await secureStorage.setItem('session', long);
    expect(await secureStorage.getItem('session')).toBe(long);
    expect([...store.values()].every((v) => v.length <= 2048)).toBe(true);
  });

  it('replaces an older, longer value cleanly and removes it fully', async () => {
    await secureStorage.setItem('k', 'a'.repeat(5000));
    await secureStorage.setItem('k', 'short');
    expect(await secureStorage.getItem('k')).toBe('short');
    expect([...store.keys()].filter((k) => k.startsWith('k.')).length).toBe(2); // one piece and the count
    await secureStorage.removeItem('k');
    expect(await secureStorage.getItem('k')).toBeNull();
    expect(store.size).toBe(0);
  });

  it('moves a session an older version left in plain storage into secure storage on first read', async () => {
    await AsyncStorage.setItem('sb-old-auth-token', 'legacy-session');
    expect(await secureStorage.getItem('sb-old-auth-token')).toBe('legacy-session');
    expect(await AsyncStorage.getItem('sb-old-auth-token')).toBeNull();
    expect(await secureStorage.getItem('sb-old-auth-token')).toBe('legacy-session');
  });

  it('treats a session with a missing piece as signed out instead of returning part of it', async () => {
    await secureStorage.setItem('k', 'b'.repeat(4000));
    store.delete('k.1');
    expect(await secureStorage.getItem('k')).toBeNull();
  });

  it('returns null for a key that was never stored', async () => {
    expect(await secureStorage.getItem('nothing')).toBeNull();
  });
});
