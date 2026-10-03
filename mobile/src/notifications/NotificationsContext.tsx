import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { notificationSchedule } from '../domain/notificationSchedule';
import { usePrototype } from '../state/PrototypeContext';

/**
 * Phone notifications for bill reminders. Off until the person turns them on in Settings (that is when the phone asks
 * for permission). The schedule is rebuilt whenever the reminders change, and cleared when they are turned off.
 */
const KEY = 'cashflow.notifications.on';

export type NotificationsResult = 'on' | 'off' | 'denied';

interface NotificationsState {
  enabled: boolean;
  /** Turn on (asks the phone for permission) or off. */
  setEnabled: (on: boolean) => Promise<NotificationsResult>;
}

const Ctx = createContext<NotificationsState | null>(null);

async function allowed(ask: boolean): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!ask || !current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { reminders } = usePrototype();
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then(async (v) => {
        if (cancelled || v !== '1') return;
        // Stay on only while the phone still allows it.
        if (await allowed(false)) setEnabledState(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        if (!enabled || cancelled) return;
        for (const n of notificationSchedule(reminders, new Date())) {
          await Notifications.scheduleNotificationAsync({
            identifier: n.id,
            content: { title: n.title, body: n.body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
          });
        }
      } catch {
        // Notifications are a convenience; the in-app reminders still work.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, reminders]);

  const setEnabled = useCallback(async (on: boolean): Promise<NotificationsResult> => {
    if (!on) {
      setEnabledState(false);
      await AsyncStorage.setItem(KEY, '0').catch(() => undefined);
      return 'off';
    }
    if (!(await allowed(true))) return 'denied';
    setEnabledState(true);
    await AsyncStorage.setItem(KEY, '1').catch(() => undefined);
    return 'on';
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(Ctx);
  if (!ctx) return { enabled: false, setEnabled: async () => 'off' };
  return ctx;
}
