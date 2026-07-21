---
title: Infrastructure (CDK)
last-updated: 2026-07-18
---

# Infrastructure as Code (IaC)

Here, we define the architecture of the cloud infrastructure (which includes database, authentication pools, functions, and permissions) as code. The language for this part of the technology stack is TypeScript. By using code, we ensure that every deployment is reproducible and reviewable. We also get the functionality of an expressive, general-purpose programming language (loops, types, reuse) instead of hand-writing raw CloudFormation YAML/JSON.

# Infrastructure (CDK)

## App / Stack structure

## DynamoDB Table
**DynamoDB** is a NoSQL key-value/document store. In _Logger's World_, we use a single-table design in which the two features of the application, `LogType` and `LogEntry`, live in the same table, distinguished by their key structure.
* Partition key (`PK`) = `USER#<ownerId>` — groups everything by owner, so "get all my stuff" is one query.
* Sort key (`SK`) = `TYPE#<typeId>` for log types, or `ENTRY#<typeId>#<createdAt>` for entries — this lets you query "all types for a user" or "all entries for one type, sorted by time" via `SK` prefix/range conditions, all on the base table, no secondary index required.

## Cognito User Pool
**Amazon Cognito** handles user authentication, removing the need to build password storage, hashing, or token issuance from scratch. In _Logger's World_, two components are used:
1. <i><b>User Pool</b></i>: the actual user directory which stores accounts, handles sign-up/sign-in, password policies, and issues JWTs on successful login.
2. <i><b>App client</b></i>: a "credential" scoped to the frontend that is allowed to communicate with the User Pool. It defines authentication flows and required client secrets. This app client has `generateSecret: false` — a deliberate choice, since a browser SPA can't keep a secret hidden and embedding one would be false security, not a default left unconsidered.

On sign-in, the App Client issues a JWT to the frontend. The frontend attaches that JWT to API requests, and the Express API's JWT verification middleware validates it to authenticate the request. The App Client never talks to the backend directly.

It is also Cognito that [ensures the uniqueness](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases) of email addresses and usernames.

**Express vs. Cognito, "app" vs. "app client":** these are two unrelated systems that share vocabulary by coincidence. Express is the framework running inside the Lambda — `const app = express()` in `index.js` is just Express's name for the object routes attach to; it has no built-in concept of users, passwords, or tokens beyond what the code explicitly checks. Cognito is a separate, AWS-managed service outside that code entirely — the User Pool is the managed user directory + hosted auth API, and the App Client is a registered *consumer* of that directory (a config profile: which auth flows are allowed, token lifetimes, secret or no secret). One User Pool can have multiple App Clients (web, mobile, etc.), all reading/writing the same underlying users.

**Token hand-off:** the frontend authenticates against Cognito directly — the Express backend is never part of login, it only ever sees the token afterward.

```
┌──────────┐   1. username+password          ┌──────────────┐
│ Frontend │ ──────────────────────────────▶ │   Cognito    │
│ (browser)│                                 │  User Pool   │
│          │   2. checks against user        │ (+ App Client│
│          │      directory, signs a JWT     │   config)    │
│          │      with Cognito's PRIVATE key │              │
│          │◀────────────────────────────────│              │
│          │   access token (JWT), + ID      └──────────────┘
│          │   token, + refresh token
└────┬─────┘
     │ 3. every API call:
     │    Authorization: Bearer <access token>
     ▼
┌────────────────────────┐   4. fetches Cognito's PUBLIC key
│  Express (backend code)│◀─────────────────────────────────┐
│  auth middleware       │   from JWKS endpoint (cached)    │
│  verifies signature,   │                                  │
│  extracts `sub` claim  │──────────────────────────────────┘
│  → req.ownerId         │
└────────────────────────┘
```

AWS supplies the trust anchor (Cognito signs with a private key only it holds, and publishes the matching public key at a stable JWKS URL); the middleware performs the actual cryptographic verification, in backend code, not at the network edge.

## Lambda Function
**AWS Lambda** is a serverless compute service in which code is only invoked when it is triggered and shut down after idling. Given that Lambda understands plain JSON objects and not HTTP directly, an adapter is needed for communication. This is where `serverless-http` comes in: it constructs a mock request (same shape as a real **Express** `req`, but built from the Lambda `event` JSON instead of a real socket) so the Express `app` handles it like a real HTTP request, then repackages the response back into the JSON shape Lambda expects; it is `serverless-http` that handles these hand-overs, not the Express app itself. The Express `app` never knows it's running inside Lambda — it stays framework-agnostic, developed and tested locally with `app.listen()` like any normal Express app, with only the thin `serverless-http` wrapper differing between local and Lambda environments.

The Function URL is a separate AWS resource that gets attached to the Lambda function in [`infra-stack.ts`](../infra/lib/infra-stack.ts) (via CDK's `addFunctionUrl()`), with `authType: FunctionUrlAuthType.NONE`.

**Two separate auth gates, not one:** `authType` controls a coarse, AWS-level question — can a request invoke the Lambda at all — completely independent of the JWT verification middleware discussed above, which runs *after* invocation, inside the Express app. The only alternative to `NONE` is `AWS_IAM`, which requires the caller to SigV4-sign requests with AWS credentials; a browser SPA can't do that, so it's not viable for a public-facing API regardless of auth strategy. `authType: NONE` is therefore the correct, permanent setting here — auth is meant to live entirely in application code, not at the invocation layer:

```
Internet → Function URL (authType: NONE, always lets the request through)
              → Express app
                  → JWT middleware (the actual gate) → 401 or req.ownerId set
                      → route handler (only reached if middleware passed)
```

## IAM Permissions
By default, AWS's security model is deny-by-default — a resource has no access to any other resource until an IAM policy explicitly grants it.

1. **Lambda execution role → DynamoDB table**: granted via CDK's `table.grantReadWriteData(backendFunction)`. This inspects both constructs and attaches a scoped-down policy directly to the Lambda's execution role, granting only the specific DynamoDB actions needed (`GetItem`, `PutItem`, `Query`, etc.) on that table's ARN specifically, not `*` — the CDK idiom for least-privilege grants between two constructs that already reference each other.
