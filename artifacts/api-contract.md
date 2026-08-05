---
title: API Contract
last-updated: 2026-07-18
---

# API Contract

## Authorization

This API has no login/signup routes of its own. Authentication is handled entirely by **Amazon Cognito**: the frontend talks to Cognito directly (via its SDK) for sign-up, sign-in, and sign-out, and receives back a JWT.

Every request to this API must include that token:

```
Authorization: Bearer <Cognito JWT>
```

The Express backend's Cognito JWT verification middleware (Day 3) validates the token on every request and extracts the user's identity from its `sub` claim — this becomes `ownerId` for all data access. `ownerId` is **never** accepted from the request body or URL; it is always derived server-side from the verified token, so one user can never read or write another user's data by tampering with a request.

## Routes

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/log-types` | `{ name, fields: [{name, type, required}] }` | Created `LogType` |
| `GET` | `/log-types` | — | `LogType[]` (all of the user's types, active and archived) |
| `GET` | `/log-types/:typeId` | — | Single `LogType` |
| `PATCH` | `/log-types/:typeId/archive` | `{ archived: boolean }` | Updated `LogType` |
| `DELETE` | `/log-types/:typeId` | — | `204 No Content` (cascades: deletes all its `LogEntry` items first, then the type) |
| `POST` | `/log-types/:typeId/entries` | `{ fields: {...} }` | Created `LogEntry` |
| `GET` | `/log-types/:typeId/entries` | — | `LogEntry[]` (chronological, newest-first) |
| `PATCH` | `/log-types/:typeId/entries/:createdAt` | `{ fields: {...} }` | Updated `LogEntry` |
| `DELETE` | `/log-types/:typeId/entries/:createdAt` | — | `204 No Content` |
| `DELETE` | `/account` | — | `204 No Content` (cascades: deletes all owned `LogType`/`LogEntry` items, then deletes the Cognito user) |

Entries are nested under their log type consistently across all routes — including `GET` (list), rather than mixing a query-param style (`/entries?typeId=`) with the path-nested style needed for `PATCH`/`DELETE`'s composite lookup (`typeId` + `createdAt`, since `LogEntry` has no single-value key — see `data-models.md`).

`:createdAt` must be URL-encoded when used as a path segment, since ISO 8601 timestamps contain colons (e.g. `2026-07-18T15%3A00%3A00Z`).

`PATCH /log-types/:typeId/archive` is intentionally narrow — it only ever toggles `archived`, not general `LogType` editing (renaming or changing `fields` is out of scope; see `roadmap.md`'s backlog).

`GET /log-types` returns both active and archived types; the frontend is responsible for splitting/filtering the view, since there's no secondary index to filter server-side (see `data-models.md`).

`DELETE /account` is not nested under `/log-types` since it targets a different resource — the authenticated caller's own account, identified the same way as everywhere else: from the verified JWT's `sub`, never from the request.
