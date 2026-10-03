// A tiny in-memory stand-in for the device storage. Every call resolves on the microtask queue, so it keeps
// working under Jest fake timers (the official mock waits on timers).
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  const api = {
    getItem: async (k) => (store.has(k) ? store.get(k) : null),
    setItem: async (k, v) => {
      store.set(k, String(v));
    },
    removeItem: async (k) => {
      store.delete(k);
    },
    clear: async () => {
      store.clear();
    },
    getAllKeys: async () => [...store.keys()],
  };
  return { __esModule: true, default: api, ...api };
});
