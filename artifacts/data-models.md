---
title: Data Models
last-updated: 2026-07-18
---

# DynamoDB

This project uses a **single table** to store multiple entity types (`LogType` and `LogEntry`), rather than one table per entity type. Every item's `PK` is `USER#<ownerId>`, scoping all of a user's data to one partition. The `SK` prefix (`TYPE#` vs `ENTRY#`) distinguishes entity types within that partition and lets each be queried independently via `SK begins_with`. Keys are derived directly from the access patterns listed under each entity below — not designed up front and queried around later, as you would with a relational schema.

## `LogType`
* **Access patterns**:
    * Get all log types for user X
    * Get log type Y for user X
* **Schema**:
    ```
    LogType
    ├── PK: USER#<ownerId>
    ├── SK: TYPE#<typeId>
    ├── typeId: string (uuid)
    ├── ownerId: string (Cognito sub)
    ├── name: string
    ├── fields: [{ name: string, type: "text" | "number" | "date", required: boolean }]
    └── createdAt: string (ISO 8601)
    ```
    * `fields` is an array (not a map) so field order is preserved for form rendering
    * `type` is a closed enum (`text` / `number` / `date`) to keep entry validation simple
    * `createdAt` isn't needed by either access pattern above — it's for display purposes and to match `LogEntry`'s shape

## `LogEntry`
* **Access patterns**:
    * Get all log entries for log type Y for user X
    * Get log entry of type Y created at Z for user X
* **Schema**:
    ```
    LogEntry
    ├── PK: USER#<ownerId>
    ├── SK: ENTRY#<typeId>#<createdAt>
    ├── typeId: string (uuid)
    ├── ownerId: string (Cognito sub)
    ├── entryId: string (uuid)
    ├── fields: { [key: string]: string | number}
    └── createdAt: string (ISO 8601)
    ```