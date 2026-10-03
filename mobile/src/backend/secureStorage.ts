import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the sign-in session is kept on the phone: the system secure storage (Keychain on iPhone, Keystore on
 * Android), not plain app storage. Secure storage limits the size of one value, so a long session is split into
 * pieces. A session that an older version left in plain storage is moved here the first time it is read.
 * Only the sign-in session goes here; the user's own records stay in the normal app storage.
 */
const CHUNK = 1800;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

/** Secure storage only accepts letters, digits, dots, dashes and underscores in a key. */
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function clear(key: string): Promise<void> {
  const n = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
  await SecureStore.deleteItemAsync(countKey(key));
}

async function write(rawKey: string, value: string): Promise<void> {
  const key = safe(rawKey);
  try {
    await clear(key);
    const parts = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < parts; i++)
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    await SecureStore.setItemAsync(countKey(key), String(parts));
    await AsyncStorage.removeItem(rawKey); // nothing is left behind in plain storage
  } catch {
    // No secure storage on this device (for example the web): keep working with plain storage.
    await AsyncStorage.setItem(rawKey, value);
  }
}

export const secureStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safe(rawKey);
    try {
      const n = Number((await SecureStore.getItemAsync(countKey(key))) ?? 0);
      if (n > 0) {
        let out = '';
        for (let i = 0; i < n; i++) {
          const part = await SecureStore.getItemAsync(chunkKey(key, i));
          if (part === null) return null; // a piece is missing: treat as signed out rather than guess
          out += part;
        }
        return out;
      }
    } catch {
      // Secure storage is not available here; fall through to plain storage.
    }
    const old = await AsyncStorage.getItem(rawKey);
    if (old !== null) {
      await write(rawKey, old).catch(() => undefined);
      return old;
    }
    return null;
  },
  setItem: write,
  async removeItem(rawKey: string): Promise<void> {
    try {
      await clear(safe(rawKey));
    } catch {
      // nothing secure to remove
    }
    await AsyncStorage.removeItem(rawKey);
  },
};
