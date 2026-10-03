import type { Backend } from '../backend/types';

/**
 * Test-only hook. When a backend is set here the app uses it instead of reading the Supabase settings.
 * In the real app nothing sets it.
 */
let backend: Backend | null | undefined;

export function setTestBackend(b: Backend | null | undefined): void {
  backend = b;
}

export function getTestBackend(): Backend | null | undefined {
  return backend;
}
