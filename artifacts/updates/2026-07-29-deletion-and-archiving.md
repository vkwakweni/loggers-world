---
title: "Update: Deletion & Archiving"
status: in-progress
started: 2026-07-29
---

# Deletion & Archiving

First post-v1 update, tracked with the same rigor as the original build (see
`../roadmap.md`, now frozen as the v1 record). Resolves two backlog items —
LogType deletion and Account deletion — and adds a new archiving feature.

## Requirements & decisions

- LogType deletion: **cascade-delete** — deleting a `LogType` deletes all its
  `LogEntry` items too (no orphaned entries, no block-on-existing-entries friction).
- Scope: LogType deletion + Account deletion (cascades all owned `LogType`/`LogEntry`
  items, then deletes the Cognito user) in this same update.
- Archiving: hides a whole `LogType` (and its entries) from the default dashboard
  view without deleting anything — complementary to delete, not a replacement.
- Automated testing: every new backend endpoint (`deleteLogType`, `archiveLogType`,
  `deleteAccount`) needs its own unit tests (success + not-found paths, mocked
  DynamoDB/Cognito clients) before merge — the manual browser walkthrough covers the
  frontend/Cognito-integration side, but isn't a substitute for automated coverage on
  the backend cascade logic itself.
- CI/merge gate: the existing GitHub Actions pipeline (lint → test → `cdk deploy`)
  must run green on this branch before merging to `main` — this update doesn't merge
  on a passing manual walkthrough alone, the automated suite has to pass too. This
  applies to every update going forward, not just this one.
- See `../data-models.md` and `../api-contract.md` for the resulting schema/route
  changes.

## Design

- New `LogType.archived: boolean` field — no new access pattern, filtered
  client-side (see `../data-models.md`).
- New routes: `DELETE /log-types/:typeId`, `PATCH /log-types/:typeId/archive`,
  `DELETE /account` (see `../api-contract.md`).
- No batch-delete/pagination helpers existed in `backend/db.js` before this update —
  added as part of it, since both cascades need "query all children, then delete all."
- Account deletion needs a new Cognito admin client (`@aws-sdk/client-cognito-identity-provider`)
  and a new IAM grant on the Lambda role (`AdminDeleteUser`/`AdminGetUser`), since
  nothing in the stack talked to Cognito's admin API before now.

## Implementation checklist

- [x] `data-models.md` — add `archived` field
- [x] `api-contract.md` — add new routes
- [x] Infra: IAM grant for Cognito admin calls, `cdk deploy` to dev
- [x] Backend: `db.js` helpers (`userKey`, `queryAllPages`, `batchDeleteItems`)
- [x] Backend: `deleteLogType` + `archiveLogType`
- [ ] Backend: `accountController.deleteAccount`
- [ ] Backend: wire new routes
- [ ] Backend: unit + integration tests
- [ ] Frontend: `api.ts` functions
- [ ] Frontend: `AuthContext` methods (`updateAttributes`, `changePassword`, `deleteCognitoUser`)
- [ ] Frontend: Dashboard active/archived split + archive/delete actions
- [ ] Frontend: LogTypeEntries archive/delete actions
- [ ] Frontend: Profile rebuild (editable fields, password change, delete account)
- [ ] Manual walkthrough of all new flows

## Testing

- Backend `npm test` (unit + integration) covering delete/archive/account paths
  against mocked DynamoDB + Cognito clients.
- Manual browser walkthrough against the dev stack (Cognito attribute/password
  changes and cross-service cascades aren't exercised by mocks).
- CI green before merge to `main`.

## Deployment

- Production deploy (CDK + Amplify) after CI is green.
- Smoke test production against a disposable test user
  (`backend/scripts/create-test-user.sh` / `delete-test-user.sh`).
- Update `../roadmap.md`'s "Later / Further Development" section to strike the
  now-resolved bullets, pointing back at this file.
