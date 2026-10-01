# Release

> Draft skeleton (P0-01).

- `main` = production, `staging` = pre-production, short-lived `feature/*` branches.
- Staging first; production deploy requires successful staging checks and protected-environment approval.
- Rollback procedure: _TBD, must be documented and tested before production._
- App-store release process (EAS Build/Submit): _TBD._
