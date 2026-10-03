/**
 * Where the backend lives. Both values are PUBLIC by design (the anon key only allows what Row Level Security
 * allows); the service-role key must never be used in the app. They are read from environment variables so they are
 * not committed. When they are missing the app runs on its own, with accounts switched off.
 */
export interface BackendConfig {
  url: string;
  anonKey: string;
}

export function readBackendConfig(
  env: Record<string, string | undefined> = process.env,
): BackendConfig | null {
  const url = env['EXPO_PUBLIC_SUPABASE_URL']?.trim();
  const anonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY']?.trim();
  if (!url || !anonKey) return null;
  if (!/^https:\/\/[^\s/]+/.test(url)) return null;
  return { url: url.replace(/\/+$/, ''), anonKey };
}

/**
 * The address of the LOCAL TEST SERVER (`npm run dev:server`), for testing on real phones without a Supabase project.
 * Only used when no Supabase settings are present. Never use it for real people.
 */
export function readDevServerUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const url = env['EXPO_PUBLIC_DEV_SERVER_URL']?.trim();
  if (!url || !/^https?:\/\/[^\s/]+/.test(url)) return null;
  return url.replace(/\/+$/, '');
}
