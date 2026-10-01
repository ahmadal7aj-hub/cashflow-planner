export type AppEnvironment = 'development' | 'staging' | 'production';

const ENVIRONMENTS: readonly AppEnvironment[] = ['development', 'staging', 'production'];

/**
 * Resolve the app environment from `EXPO_PUBLIC_APP_ENV`.
 * Unknown or missing values fall back to `development` so a misconfigured build can never
 * silently present itself as production.
 */
export function resolveAppEnvironment(raw: string | undefined): AppEnvironment {
  const value = raw?.trim().toLowerCase();
  return ENVIRONMENTS.find((env) => env === value) ?? 'development';
}

export function isProduction(env: AppEnvironment): boolean {
  return env === 'production';
}

export function environmentLabel(env: AppEnvironment): string {
  return env === 'production' ? '' : `${env.toUpperCase()} build`;
}

export const appEnvironment: AppEnvironment = resolveAppEnvironment(
  process.env.EXPO_PUBLIC_APP_ENV,
);
