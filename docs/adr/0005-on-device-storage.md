# ADR 0005: Save the plan on the device (no backend yet)

- Status: Accepted for the prototype; the cloud-versus-on-device question for Phase 2 stays open (ADR 0004)
- Date: 2026-10-03

## Context

The owner asked for budgets, dated spending and savings that are still there after the app is closed. The earlier
prototype kept everything in memory. Accounts, a database and sharing between two people (Phase 2) are still gated on
interview evidence, so a backend is out of scope.

## Decision

- Save the whole plan as **one versioned JSON document** in the device's app storage (AsyncStorage, an Expo-supported
  module that Expo Go includes). Nothing is sent anywhere.
- Wrap it as `{ schemaVersion, plan }`. Migrations run one version at a time. **Before any migration, and before
  touching data that cannot be read, write a backup copy** under `cashflow.backup.*`. Never load or overwrite data
  written by a newer schema version.
- Keep history: amounts are **effective-dated** per month, deleted items move to a **retired** list, and each finished
  month is closed **once** into a frozen record. Changes to a closed month add a dated **correction** instead of
  rewriting it.
- Provide **Export my data** (JSON through the phone's share sheet) so the user holds their own copy.

## Consequences

- **Privacy:** the data stays on the phone. It is not encrypted by the app itself; it relies on the phone's own
  protections. Storing it in plain app storage is acceptable for a prototype with test users and **must be revisited
  before real users** (encrypted storage, or the Phase 2 database with Row Level Security).
- **Loss risk:** uninstalling the app or clearing its data erases the plan. Export is the only backup until Phase 2.
- **No sync, no sharing:** the Household / Shared dashboard stays a single-phone preview with a made-up partner.
- **Logging:** no amounts, notes or balances are logged or put in analytics (unchanged).
- **Later:** moving to SQLite or the cloud means writing a migration from this document; the schema version exists for that.
