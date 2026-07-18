---
title: 7-Day Development Roadmap
last-updated: 2026-07-18
---

# 7-Day Development Roadmap

| Day | SDLC Phase | Focus |
|---|---|---|
| 1 | Requirements & Design | Data model, API contract, wireframes |
| 2 | Infrastructure (IaC) | CDK stack: DynamoDB, Cognito, Lambda |
| 3 | Backend Development | Express API + auth middleware |
| 4 | Frontend Development (core) | App scaffold, auth flow, log-type builder |
| 5 | Frontend Development (views) + Integration | Entry form/list, wired to live API |
| 6 | Testing & CI/CD | Tests, GitHub Actions pipeline, UX polish |
| 7 | Deployment & Documentation | Production deploy, README, demo, retro |

**Sequencing logic:** infra before backend (Day 2 before 3) since the API needs the table/auth to exist; backend before full frontend integration (Day 3 before 5) since the UI needs real endpoints to call against. Days 4–5 can overlap with Day 3's tail end if mocking the API contract first.

## Day 1 — Requirements & Design

- [x] Write core user stories (create log type, add entry, view entries by type)
- [x] Finalize `LogType` schema: `{typeId, name, ownerId, fields: [{name, type, required}]}`
- [x] Finalize `LogEntry` schema: `{entryId, typeId, ownerId, fields: {...}, createdAt}`
- [x] Define API contract: `POST/GET /log-types`, `GET /log-types/:typeId`, `POST/GET /log-types/:typeId/entries`, `PATCH/DELETE /log-types/:typeId/entries/:createdAt`
- [x] Sketch wireframes: dashboard, log-type builder, entry form, entry list, edit/delete entry
- [x] Set up GitHub repo + branch strategy (`main` + feature branches)
- [x] `cdk init` empty stack; scaffold `frontend/` (Vite) and `backend/` (Express) folders

## Day 2 — Infrastructure (IaC)

- [ ] Define DynamoDB table in CDK (single-table design, `PK = USER#<ownerId>`, `SK` prefixed `TYPE#`/`ENTRY#`, entries' `SK` composed with `typeId` + `createdAt` — no GSI needed, all access patterns satisfied by the base table)
- [ ] Define Cognito User Pool + App Client in CDK
- [ ] Wrap Express app for Lambda (e.g. `serverless-http`) + attach Function URL
- [ ] Grant Lambda IAM read/write on the DynamoDB table
- [ ] Pass table name / pool ID to Lambda via env vars
- [ ] `cdk deploy` to dev; verify resources in AWS console
- [ ] Smoke test: hit Function URL directly, confirm a clean response

## Day 3 — Backend Development

- [ ] Scaffold Express routes/controllers + DynamoDB client wrapper
- [ ] Implement `LogType` CRUD endpoints
- [ ] Implement `LogEntry` CRUD endpoints (validate entry fields against parent `LogType`)
- [ ] Add Cognito JWT verification middleware (validate token, extract user ID, scope queries to owner)
- [ ] Unit tests for route handlers (mock DynamoDB client)
- [ ] Deploy Lambda, hit endpoints via curl/Postman

## Day 4 — Frontend Development (core)

- [ ] Scaffold React/Vite app + routing (`react-router`)
- [ ] Integrate Cognito auth (sign-up, sign-in, sign-out, token storage)
- [ ] Build protected-route wrapper
- [ ] Build "Log Type Builder" form (dynamically add fields: name + type)
- [ ] Wire builder to `POST /log-types`
- [ ] Build "My Log Types" list view (`GET /log-types`)

## Day 5 — Frontend Development (views) + Integration

- [ ] Build dynamic "Add Entry" form that renders inputs from the selected `LogType`'s fields
- [ ] Wire to `POST /log-types/:typeId/entries`
- [ ] Build entry list/table view per log type (`GET /log-types/:typeId/entries`), sorted chronologically via the base table's sort key (newest-first), with per-row Edit/Delete actions
- [ ] Build "Edit Entry" form (pre-filled), wired to `PATCH /log-types/:typeId/entries/:createdAt`
- [ ] Wire delete action (with confirmation) to `DELETE /log-types/:typeId/entries/:createdAt`
- [ ] Basic layout/styling (nav, dashboard shell)
- [ ] Full manual walkthrough: sign up → create log type → add entries → view list → edit entry → delete entry
- [ ] Fix integration bugs (CORS, auth headers, field-validation mismatches)

## Day 6 — Testing & CI/CD

- [ ] Integration tests for core flow (create type → create entry → fetch → edit → delete)
- [ ] Basic frontend tests if time allows (render, form submit)
- [ ] GitHub Actions workflow: lint → test → `cdk deploy` on merge to `main`
- [ ] Amplify Hosting build config triggered from GitHub
- [ ] Run full pipeline once end-to-end; fix CI failures
- [ ] UX polish: loading states, error messages, empty states

## Day 7 — Deployment & Documentation

- [ ] Final production deploy (CDK stack + Amplify frontend)
- [ ] Smoke test production (auth + create/read flows)
- [ ] Write README: architecture diagram, setup steps, live demo link
- [ ] Record short demo GIF/video for portfolio
- [ ] Write retro notes: challenges, what you'd change, resume bullet points
- [ ] Tag a `v1.0` release

## Later / Further Development

- Dedicated timeline view: a cross-entry chronological display (distinct from the per-log-type list), possibly with date grouping/visual density beyond a plain table
- Client-side sort toggle: let the user re-sort the entry list by any field (not just chronological), on top of the free DynamoDB-order sort shipped in Day 5
- `LogType` editing (rename/add/remove fields): not in this week's scope since only creation is planned, but once editing exists, existing `LogEntry` items won't retroactively match the updated `fields` list — needs a strategy (e.g. migrate old entries, or tolerate/display drifted fields gracefully)
- Entry filtering: let the user narrow the entry list by field value or date range, beyond the default chronological view shipped in Day 5