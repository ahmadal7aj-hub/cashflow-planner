import type { Plan } from '../domain/budgetModel';

/**
 * Test-only hook. When a plan is set here the provider starts from it immediately and does not read the
 * device storage. In the real app nothing sets it, so the provider loads what the user saved.
 */
let seed: Plan | undefined;

export function setTestSeed(plan: Plan | undefined): void {
  seed = plan;
}

export function getTestSeed(): Plan | undefined {
  return seed;
}
