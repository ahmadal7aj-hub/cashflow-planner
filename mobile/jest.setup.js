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
    multiRemove: async (keys) => {
      for (const k of keys) store.delete(k);
    },
  };
  return { __esModule: true, default: api, ...api };
});

// Phone notifications: records what is scheduled so tests can look at it.
jest.mock('expo-notifications', () => {
  const state = { granted: false, canAskAgain: true, answer: true, scheduled: [] };
  return {
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ granted: state.granted, canAskAgain: state.canAskAgain }),
    requestPermissionsAsync: async () => {
      state.granted = state.answer;
      state.canAskAgain = state.answer;
      return { granted: state.granted, canAskAgain: state.canAskAgain };
    },
    cancelAllScheduledNotificationsAsync: async () => {
      state.scheduled.length = 0;
    },
    scheduleNotificationAsync: async (req) => {
      state.scheduled.push(req);
      return req.identifier;
    },
    __state: state,
  };
});

// An in-memory stand-in for the secure storage of the phone.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: async (k) => (store.has(k) ? store.get(k) : null),
    setItemAsync: async (k, v) => {
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error('invalid key');
      if (String(v).length > 2048) throw new Error('value too large');
      store.set(k, String(v));
    },
    deleteItemAsync: async (k) => {
      store.delete(k);
    },
    __store: store,
  };
});
