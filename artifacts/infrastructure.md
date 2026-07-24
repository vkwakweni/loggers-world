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

**Identity model: email is the username, not an alias.** Cognito lets you configure a second sign-in identifier (like email) two different ways, which look similar but behave very differently:
- **Alias attribute** (the original setup here — `signInAliases: { email: true, username: true }`): email is a *pointer* to the real username. Per [AWS's docs](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#user-pool-settings-aliases), aliases are only enforced unique among **confirmed** users. In practice, manual testing found this meant: any number of `UNCONFIRMED` accounts could share the same email with no warning at sign-up, and when a second account confirmed with an already-claimed email, Cognito silently reassigned the alias — flipping the *first* account's `email_verified` back to `false` with no notice to either party. A mistyped email at sign-up also permanently stranded that username on an unrecoverable `UNCONFIRMED` account, since there was no in-app way to edit the email or delete/retry.
- **Username attribute** (current setup — `signInAliases: { email: true }` only): email itself *is* the pool's username, so it's enforced unique immediately at sign-up, the same way a real username would be — confirmed via testing: a duplicate `signUp()` now fails instantly with `UsernameExistsException`, before confirmation is even reached.

Given this, the pool now uses email as the sole login identifier. The old "username" field became a display name — Cognito's `preferred_username` attribute, stored but deliberately *not* declared as a sign-in alias, so it's never uniqueness-checked and never used for auth.

**Changing `UsernameAttributes` requires pool replacement, not update.** It's an immutable CloudFormation property — `cdk deploy` with the changed setting fails outright (`"Updates are not allowed for property - AliasAttributes"`) rather than replacing in place. Since this pool has `removalPolicy: DESTROY` and zero real users, the fix was to rename the CDK construct ID (`LoggersWorldUserPool` → `LoggersWorldUserPoolV2`), which makes CloudFormation treat it as a brand-new resource — creating the new pool and deleting the old one in the same deploy. This is **only safe pre-launch**: doing this against a live pool with real users would delete all of them. Migrating an already-launched pool's `UsernameAttributes` instead requires standing up a second pool and using Cognito's User Migration Lambda trigger, which validates each user's credentials against the old pool and silently recreates them in the new one on their next login — since Cognito never exposes password hashes for direct copying.

**Express vs. Cognito, "app" vs. "app client":** these are two unrelated systems that share vocabulary by coincidence. Express is the framework running inside the Lambda — `const app = express()` in `index.js` is just Express's name for the object routes attach to; it has no built-in concept of users, passwords, or tokens beyond what the code explicitly checks. Cognito is a separate, AWS-managed service outside that code entirely — the User Pool is the managed user directory + hosted auth API, and the App Client is a registered *consumer* of that directory (a config profile: which auth flows are allowed, token lifetimes, secret or no secret). One User Pool can have multiple App Clients (web, mobile, etc.), all reading/writing the same underlying users.

**Frontend integration:**
- The frontend talks to Cognito directly from the browser (sign-up, sign-in, sign-out) — no backend involvement for auth itself, since Cognito issues the JWT the backend already validates.
- Uses `amazon-cognito-identity-js`, the lighter-weight SDK for this (vs. the full AWS Amplify library), since only auth is needed, not Amplify's other features.
- Flow: `CognitoUserPool` (configured with Pool ID + Client ID) → `signUp(email, displayName, password)` creates an account (`displayName` stored as the non-unique `preferred_username` attribute) → Cognito emails a confirmation code (`autoVerify: { email: true }` triggers sending it, it does **not** skip confirmation) → `confirmSignUp(email, code)` submits it → `authenticateUser()` on sign-in returns tokens (**access** token is sent as the `Authorization` header to the backend — the middleware's verifier is configured with `tokenUse: 'access'`, not the ID token) → tokens are stored (session-managed by the SDK, backed by `localStorage`) → sign-out clears the session.
- Wrapped in a small `auth.ts` helper + a React context (`AuthContext`), so any component can check "am I logged in" and get the current token — the same context a protected-route wrapper reads from to gate access to authenticated pages. `AuthContext` also exposes `resendConfirmationCode` for the case where the emailed code doesn't arrive or expires.

**Testing auth:** `backend/scripts/` has throwaway test-user tooling (credentials in `test-user.env`, gitignored) that sidesteps self-signup entirely via `admin-create-user` (sets `email_verified=true` and a permanent password directly, no confirmation code needed):
- `create-test-user.sh` — (re)creates the test user in Cognito; safe to re-run if the user was deleted or the pool was redeployed
- `get-test-token.js` — runs the exact same `CognitoUser` / `AuthenticationDetails` / `authenticateUser` flow the frontend's `AuthContext.signIn()` uses, and prints a real access token — useful as a quick sanity check that Cognito is reachable/configured correctly, independent of the browser
- `delete-test-user.sh` — cleans it up

To manually test the frontend against a real account: run `npm run dev`, log in at `/login` with the test user's credentials, and confirm redirect to `/dashboard` plus `CognitoIdentityServiceProvider.*` keys appearing in the browser's Local Storage. To test self-signup end-to-end, use a real email you control (Cognito actually sends the code — there's no way to script around that) and walk `/signup` → confirmation code from the inbox → `/login`.

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

**CORS is a separate, browser-only concern from either auth gate above.** The first real frontend API call (`POST /log-types` from the Log Type Builder) failed with a generic "Failed to fetch" — not a 401 or 403, since the browser never let the request reach the server at all. Browsers enforce the same-origin policy: JS on one origin (`http://localhost:5173`) can't read a response from another (the Function URL's domain) unless the server opts in via `Access-Control-Allow-*` headers. For "non-simple" requests (ours sends `Content-Type: application/json` and a custom `Authorization` header), the browser first sends an automatic preflight `OPTIONS` request to check permission before sending the real one — neither the Function URL nor Express was answering it, so the browser silently blocked the request client-side. Tools like `curl` or `get-test-token.js` never hit this, since CORS is purely a browser-enforced restriction, not a server-side check — which is why auth testing worked fine while this went unnoticed.

Fixed via the Function URL's native `cors` config (in `addFunctionUrl()`), which handles the preflight at the AWS level before Lambda is even invoked — simpler than adding `cors` middleware in Express. The allowed origin is read from `process.env.FRONTEND_ORIGIN`, sourced from `infra/.env` (gitignored, loaded via `dotenv` in `bin/infra.ts`) rather than hardcoded, since it needs to change once the frontend is actually deployed (Day 7, Amplify Hosting) — that's a `TODO` left in `infra-stack.ts` for now.

## IAM Permissions
By default, AWS's security model is deny-by-default — a resource has no access to any other resource until an IAM policy explicitly grants it.

1. **Lambda execution role → DynamoDB table**: granted via CDK's `table.grantReadWriteData(backendFunction)`. This inspects both constructs and attaches a scoped-down policy directly to the Lambda's execution role, granting only the specific DynamoDB actions needed (`GetItem`, `PutItem`, `Query`, etc.) on that table's ARN specifically, not `*` — the CDK idiom for least-privilege grants between two constructs that already reference each other.
