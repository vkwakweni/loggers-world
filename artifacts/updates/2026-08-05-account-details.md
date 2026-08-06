---
title: "Update: Account Details"
status: in-progress
started: 2026-08-05
---

# Account Details
Resolves the "Updating account details" backlog item in `../roadmap.md`.

## Requirements & decisions

- Scope: display name becomes editable, and a password-change flow is added.
  Both go through Cognito directly via `amazon-cognito-identity-js` — no
  DynamoDB involvement, so no backend endpoint work at all in this update.
- Email change is explicitly **out of scope**. This pool's `UsernameAttributes`
  is `[email]`, meaning email IS the Cognito username, not just a regular
  attribute — changing it would need a confirmation-code re-verification flow
  (same shape as sign-up) and a pending-change UI state, which is materially
  bigger and riskier than the other two. Logged as its own future backlog item
  in `../roadmap.md`.
- Automated testing: no new backend endpoints exist to test, so the usual
  "every new backend endpoint needs unit tests" rule doesn't apply here — this
  update is covered by manual walkthrough + `tsc -b --noEmit`/lint, consistent
  with the frontend-testing policy already in place.
- CI/merge gate: same standing rule as always — lint, `tsc -b --noEmit`, and
  existing tests must be green on this branch before merging to `main`.

## Design

- `AuthContext` gains two methods:
  - `updateAttributes(attributes: Partial<UserAttributes>)` — generic rather
    than display-name-specific, so a future editable field (e.g. a pronoun or
    location attribute) only needs an entry added to `UserAttributes` and the
    new `COGNITO_ATTRIBUTE_NAMES` lookup table, not a new function. Wraps
    `currentUser.updateAttributes`, same callback-to-Promise pattern as the
    existing methods.
  - `changePassword(oldPassword: string, newPassword: string)` — wraps
    `currentUser.changePassword`.
- `Profile.tsx`: display name switches from static text to an editable field
  with a Save action; a separate password-change form (current password, new
  password) is added below it.
- No changes to `api.ts`, `data-models.md`, or `api-contract.md` — this is a
  Cognito-only feature, nothing touches the backend or DynamoDB.

## Implementation checklist

- [x] `AuthContext`: `updateAttributes`
- [ ] `AuthContext`: `changePassword`
- [ ] Frontend: Profile editable display name + save
- [ ] Frontend: Profile password-change form
- [ ] Manual walkthrough of both flows

## Testing

- No new backend endpoints, so no backend automated-test requirement applies
  to this update.
- Manual browser walkthrough: display name update, password change with both
  correct and incorrect current password.
- CI green before merge to `main`.

## Deployment

- No infra/backend changes, so `cdk deploy` on merge is a no-op beyond what CI
  always runs — the actual deliverable here is the Amplify frontend rebuild.
- Smoke test production: update display name and password on a disposable
  test user, confirm both stick.
- Update `../roadmap.md`: strike "Updating account details", add a new
  backlog item for email change pointing at this doc's scope decision.
