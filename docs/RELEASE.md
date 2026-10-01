# Release

> Draft skeleton (P0-01).

- `main` = production, `staging` = pre-production, short-lived `feature/*` branches.
- Staging first; production deploy requires successful staging checks and protected-environment approval.
## Branch governance (P0-04)

Applied to `main` and `staging`:

- Pull request required; direct pushes blocked (including admins: `enforce_admins` on).
- Required status checks: Quality, Security (dependencies), CodeQL.
- Conversation resolution required; force pushes and deletions blocked; linear history (squash merges).
- Required approving reviews is **0** because the project currently has a single maintainer (GitHub does not allow approving your own PR). Raise to 1 when a second reviewer joins.
- Secret scanning + push protection and Dependabot alerts/security updates are enabled.

## Release

- Rollback procedure: _TBD, must be documented and tested before production._
- App-store release process (EAS Build/Submit): _TBD._
