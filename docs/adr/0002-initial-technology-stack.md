# ADR 0002: Initial technology stack

- Status: Accepted
- Date: 2026-10-01

## Context

The BRD (section 10) recommends a stack suited to a small team using AI coding agents, with strong typing, testing and security tooling.

## Decision

- Mobile: React Native + Expo (SDK 57) + TypeScript in strict mode (plus `noUncheckedIndexedAccess`), in `mobile/`.
- Package manager: **npm** (lockfile committed). pnpm via corepack needs admin rights on the founder machine and adds nothing needed at this scale.
- Quality tooling: ESLint (`eslint-config-expo`) + Prettier, Jest (`jest-expo`) + React Native Testing Library.
- Backend: Supabase (PostgreSQL + RLS, Auth, Edge Functions), introduced in Phase 2.
- E2E: Maestro (P0-05). CI/CD: GitHub Actions; Expo EAS for builds.
- Navigation (Expo Router) and Zod, TanStack Query, React Hook Form are added when first needed (Phase 1+), not before.

## Consequences

- Backend, auth, analytics and monetization remain out of the codebase until their phases.
- `npm audit` currently reports moderate advisories in Expo build-tooling transitive dependencies. We do not run `npm audit fix --force` (it would break the SDK). CI blocks high/critical production-dependency advisories; moderate tooling advisories are tracked and revisited on each Expo SDK upgrade.
