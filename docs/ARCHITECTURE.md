# Architecture

> Draft skeleton (P0-01). Fill in as decisions are made; record each material decision as an ADR in `adr/`.

## System context

- Mobile app (React Native + Expo + TypeScript) for iOS/Android.
- Backend: Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions).
- No bank connectivity in MVP (deferred to Phase 7, separate go/no-go).

## Components

_TBD: app modules, domain layer (pure forecast functions), data access, shared Zod schemas._

## Data flows and trust boundaries

_TBD: device -> Supabase (TLS, user JWT, RLS). Service-role key is server-side only and never ships in the client._

## Key principles

- Deterministic, versioned, unit-tested financial engine; `calculation_version` stored with forecasts.
- No duplicated financial formulas in UI components.
- Strings, currency and date formatting centralized (localization readiness).
