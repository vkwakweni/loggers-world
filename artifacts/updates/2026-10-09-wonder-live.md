---
title: "Update: Wonder live"
status: in progress
started: 2026-10-09
---

# Wonder live

Seventh post-v1 update. Turns the Wonder page (the Turaco Chorus insights feature) on in production. It is hidden there today because the frontend only shows it when `VITE_CHORUS_URL` is set, and the live Turaco Chorus deployment cannot yet be used by a public site. Most of the work is in the Turaco Chorus repository; this doc is the plan and the record, because the feature is Logger's World's.

## Why it is hidden in production

- **Plain HTTP.** Logger's World is served over HTTPS from Amplify, and browsers block an HTTPS page from calling a plain-HTTP API.
- **IP allow-list.** Turaco Chorus's security group admits only a few addresses, so public visitors cannot reach it.
- **Fake backends.** It runs a fake identity verifier (one shared test credential) and a fake log data source, so it does not read anyone's real entries.
- **Unprotected AI spend.** `/ask` calls a free-tier AI provider, so a public endpoint needs a rate limit.

## Requirements & decisions

- **HTTPS by Caddy on the instance**, not an ALB or CloudFront. It is free and encrypted all the way to the instance. An ALB is free only until 19 Jan 2027 and costs money after; CloudFront would leave the last hop to the instance as plain HTTP carrying the login tokens. Details in Turaco Chorus's `artifacts/ecs-deployment.md`, "Deployment mode and public HTTPS".
- **Opt-in by a local file.** Real or fake adapters and public HTTPS are chosen by the gitignored `infra/config/deployment.local.json` in Turaco Chorus. Without it the demo deployment is unchanged. Opening to the internet with the fake verifier is refused. No real identifier of Logger's World enters a committed Turaco Chorus file.
- **Rate limit on `/ask`:** per client address (default 10 a minute) and across all clients (default 500 a day), configurable. The defaults are guesses, not derived from the provider's quota.
- **Order matters.** Real identity must be deployed before the service is opened to the internet, and the certificate cannot be issued while the allow-list is in place, so the real-adapter and public-HTTPS settings are deployed together in one `cdk deploy`.
- **Known limit of the data.** Turaco Chorus's "date" dimension reflects when an entry was saved, not a date the user entered (found in the 2026-09-05 trial), so date-based answers describe logging activity.

## Implementation checklist

Done, awaiting your merge:

- [x] Turaco Chorus: opt-in deployment mode and public HTTPS through a Caddy proxy container, with a guard against a public fake verifier ([PR #19](https://github.com/vkwakweni/turaco-chorus/pull/19))
- [x] Turaco Chorus: rate limit on `/ask` and trusted forwarded headers behind the proxy ([PR #20](https://github.com/vkwakweni/turaco-chorus/pull/20), stacked on #19, so merge #19 first)

Needs you, in this order:

- [ ] **1. Merge Turaco Chorus #19, then #20.** Merging redeploys the container image through CI. That adds the rate limiter to the current demo deployment and changes nothing else, because the infrastructure only changes when you run `cdk deploy` yourself.
- [ ] **2. Fill in Turaco Chorus's real config.** In `turaco-chorus/infra/config/task-environment.local.json` (gitignored), set the real `Cognito:*` and `DynamoDb:LogData:*` keys. They are the same values you used for the local trial, so copy them from Turaco Chorus's `dotnet user-secrets` (open the secrets file yourself; do not paste them anywhere). The Cognito user pool id and app client id are also in the Logger's World stack outputs: `aws cloudformation describe-stacks --stack-name InfraStack --region af-south-1 --query "Stacks[0].Outputs" --output table` (`UserPoolIdOutput`, `UserPoolClientIdOutput`). `Cognito:TokenType` is `AccessToken`, because the Wonder page sends the access token.
- [ ] **3. Allow the live site's origin.** In the same file add `"AllowedOrigins": "<the live Logger's World address>"`, the same value as the repository variable `FRONTEND_ORIGIN`. For the test in step 6, list `http://localhost:5173` as well, comma separated, and remove it again afterwards.
- [ ] **4. Opt in.** Copy `infra/config/deployment.example.json` to `infra/config/deployment.local.json` (it already says real identity, real log data, public HTTPS).
- [ ] **5. Review, then deploy.** From `turaco-chorus/infra`, run `npx cdk diff TuracoChorusComputeStack --no-validation` and read it first. Expect: the security group opening ports 80 and 443 to the internet, a replaced task definition with a second container (`ProxyContainer`, image `caddy:2`), a new read-only DynamoDB grant on Logger's World's table, and the fake test credential secret and the allow-list output going away. Then deploy with `cdk deploy --no-validation TuracoChorusComputeStack`. The service restarts, so Turaco Chorus is down for a minute or two.
- [ ] **6. Check HTTPS and real login.** Watch the `proxy` container's logs in CloudWatch until Caddy reports it obtained a certificate (this can take a minute). Then `curl -i https://turacochorus.literaturelounge.org/consent` should answer `401` over HTTPS. To test with a real user, put `VITE_CHORUS_URL=https://turacochorus.literaturelounge.org` in `frontend/.env.local`, run the frontend locally, sign in, grant consent on the Wonder page, view the stats and ask a question.
- [ ] **7. Check the rate limit sees real clients.** The limiter depends on the proxy forwarding the client's address, which has not been verified. Ask 11 questions in a minute from your browser: the 11th should be refused with "Too many requests". Then ask once from a phone on another network: it should work. If the phone is refused too, the limiter is seeing the proxy's address and must be fixed before going public.
- [ ] **8. Set the daily cap from the provider's quota.** Look up the free-tier request quota of the configured AI provider, and set `"RateLimiting:Ask:GlobalPerDay"` (and `PerIpPerMinute` if wanted) in `task-environment.local.json`, then redeploy.
- [ ] **9. Turn it on in production.** In the Amplify console for this app, add the environment variable `VITE_CHORUS_URL` with value `https://turacochorus.literaturelounge.org`, then redeploy `main` (Vite bakes the value in at build time, so a new build is needed). Remove `http://localhost:5173` from `AllowedOrigins` and redeploy Turaco Chorus.
- [ ] **10. Confirm in production.** The Wonder link appears in the nav, the consent flow works for a normal user, and a question gets an answer.
- [ ] Update `design-system.md` and the README, which say Chorus surfaces only appear when `VITE_CHORUS_URL` is set locally.

## Testing

- Turaco Chorus: 11 Jest tests for the mode parsing and the guard, and unit tests for the limiter and its options. `cdk synth` in default mode is byte-identical to before, and in public mode shows the two open ports, the proxy container with its link and certificate volume, and no fake secret.
- The 429 behaviour was checked locally against the running app: requests beyond the limit return `429` with `Retry-After` and the JSON error body, ahead of authentication.
- Not verified until step 6 and 7: a live deploy, certificate issuance, the proxy forwarding the client address, and where the official Caddy image keeps its data.

## Deployment

Frontend through Amplify on merge to `main`, plus the environment variable in step 9. Turaco Chorus infrastructure through your own `cdk deploy`; CI only redeploys the container image.

## Rolling back

Delete `deployment.local.json` (or set `publicHttps` to `false`) and run `cdk deploy --no-validation TuracoChorusComputeStack` again: the stack returns to the demo deployment with the allow-list. Remove `VITE_CHORUS_URL` in Amplify and redeploy to hide the Wonder page again.

## Follow-ups

- If the instance is replaced, Caddy asks for a new certificate; Let's Encrypt allows this at the expected rate.
- The single instance is down while it restarts during a deploy.
- A rejected `/ask` (rate limit) is not written to Turaco Chorus's audit log; this joins the existing audit-coverage gap on its roadmap.
- The Wonder page shows the server's message for a 429. A friendlier message is a possible polish item.
