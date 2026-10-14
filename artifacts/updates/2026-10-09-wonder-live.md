---
title: "Update: Wonder live"
status: done
started: 2026-10-09
completed: 2026-10-14
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

### Done and merged

- [x] Turaco Chorus [PR #19](https://github.com/vkwakweni/turaco-chorus/pull/19): opt-in deployment mode and public HTTPS through a Caddy proxy container, with a guard against a public fake verifier
- [x] Turaco Chorus [PR #20](https://github.com/vkwakweni/turaco-chorus/pull/20): rate limit on `/ask` and trusted forwarded headers behind the proxy
- [x] Turaco Chorus [PR #21](https://github.com/vkwakweni/turaco-chorus/pull/21): CI runs queue per ref, so quick merges cannot leave the `latest` image on the older commit
- [x] Turaco Chorus [PR #22](https://github.com/vkwakweni/turaco-chorus/pull/22): the Docker image is built on pull requests (no push, no deploy)
- [x] The merges redeployed the running demo's container image through CI, so the demo now has the rate limiter. Its infrastructure is unchanged until step 6.

### Your steps

Run them in order. Steps 1 to 4 only prepare and change nothing live; step 6 is the first change to the running service. All commands start from the folder that holds your `turaco-chorus` and `loggers-world` checkouts unless they say otherwise. Never paste secret values into chat, a commit or a PR.

- [x] **1. Update your Turaco Chorus checkout and check your AWS login**
    - [x] Pull the merged changes:
        ```bash
        cd turaco-chorus
        git switch main && git pull
        ```
    - [x] Check the AWS login is the account you used for earlier Turaco Chorus deploys, and the region is `af-south-1`:
        ```bash
        aws sts get-caller-identity
        aws configure get region
        ```

- [x] **2. Gather Logger's World's real values** (identifiers and settings, not passwords)
    - [x] The Cognito user pool id and app client id, from the Logger's World stack outputs (`UserPoolIdOutput` and `UserPoolClientIdOutput`):
        ```bash
        aws cloudformation describe-stacks --stack-name InfraStack --region af-south-1 --query "Stacks[0].Outputs" --output table
        ```
    - [x] The DynamoDB table name (pick Logger's World's table from the list):
        ```bash
        aws dynamodb list-tables --region af-south-1
        ```
    - [x] The key layout and dimension settings, which are the same ones the local trial used. They are in Turaco Chorus's user secrets; this prints only the Cognito and log-data keys, and the values appear in your terminal, so do it somewhere private:
        ```bash
        cd turaco-chorus
        dotnet user-secrets list --project src/TuracoChorus | grep -E "^(Cognito|DynamoDb:LogData)"
        ```
    - [x] The live site's origin, which is the same value Logger's World's CI uses (it prints the live address and `http://localhost:5173`, comma separated):
        ```bash
        gh api repos/vkwakweni/loggers-world/actions/variables/FRONTEND_ORIGIN --jq .value
        ```

- [x] **3. Fill in `turaco-chorus/infra/config/task-environment.local.json`**
    - It is gitignored and flat, with `Section:Key` names. `task-environment.example.json` next to it shows every key. Leave `Aws:Region` and `InsightProvider` as they are.
    - [x] Add the four Cognito keys: `Cognito:UserPoolId`, `Cognito:Region`, `Cognito:AppClientId` (values from step 2) and `Cognito:TokenType` set to `AccessToken`, because the Wonder page sends the access token
    - [x] Add the `DynamoDb:LogData:*` keys with the values from the user secrets: `TableName`, `PartitionKeyAttribute`, `PartitionKeyValueTemplate`, `SortKeyAttribute`, `EntrySortKeyPrefix`, `DateAttribute`, and every `Dimensions:<n>:*` key
    - [x] Add `"AllowedOrigins"` with the value printed in step 2 (the live origin and localhost). Localhost is only for the test in step 8 and is removed in step 11
    - [x] Check the file is still valid JSON (this prints nothing sensitive):
        ```bash
        cd turaco-chorus
        python3 -m json.tool infra/config/task-environment.local.json > /dev/null && echo "valid json"
        ```

- [x] **4. Opt in to real adapters and public HTTPS**
    - [x] Create the deployment-mode file from the template (it already says real identity, real log data, public HTTPS; it is gitignored):
        ```bash
        cd turaco-chorus/infra
        cp config/deployment.example.json config/deployment.local.json
        ```
    - [x] Dry-run the configuration without touching AWS. Success prints `config ok`; a problem names the missing key:
        ```bash
        npx cdk synth --no-validation TuracoChorusComputeStack > /dev/null && echo "config ok"
        ```

- [x] **5. Review the change before deploying**
    - [x] Show what the deploy would change:
        ```bash
        cd turaco-chorus/infra
        npx cdk diff --no-validation TuracoChorusComputeStack
        ```
        If CDK rejects the flag on `diff` or reports a Route 53 validation error, copy the message and ask Claude; do not deploy.
    - [x] Read the output. You should expect all of these and nothing else:
        - the security group opens ports 80 and 443 to the internet
        - a replaced task definition with a second container (`ProxyContainer`, image `caddy:2`) and a certificate volume
        - a new read-only DynamoDB grant (`Query`, `GetItem`) on Logger's World's table
        - the fake test credential secret removed
        - the allow-list output removed
    - [x] If anything else changes, such as a replaced Elastic IP, hosted zone or table, stop and paste the diff to Claude

- [x] **6. Deploy**
    - [x] Deploy and answer `y` when CDK asks to approve the security group and IAM changes:
        ```bash
        cd turaco-chorus/infra
        npx cdk deploy --no-validation TuracoChorusComputeStack
        ```
    - [x] Expect Turaco Chorus to be down for a minute or two while the task is replaced, and the command to finish with the stack outputs, where `ServiceUrlOutput` now starts with `https://`

- [x] **7. Check HTTPS**
    - [x] Find the proxy's log group and read its log until Caddy reports it obtained a certificate (this can take a minute; no `obtained` line after five minutes means a problem). In the first run the log was empty even though HTTPS worked, so an empty log is not a failure by itself: the `curl` below is the real check. The group's name contains `ProxyContainerLogGroup`; the `TuracoChorus`-named groups under `/aws/lambda` are CDK helpers, not the container logs, and the `TuracoChorusContainerLogGroup` one is the main container's:
        ```bash
        LG=$(aws logs describe-log-groups --region af-south-1 --query 'logGroups[?contains(logGroupName, `ProxyContainerLogGroup`)].logGroupName | [0]' --output text)
        aws logs tail "$LG" --log-stream-name-prefix proxy --since 15m --region af-south-1 --filter-pattern "obtained"
        ```
    - [x] If there is no `obtained` line, read the proxy's log without the filter and copy the error to Claude. The usual causes are ports 80 or 443 not reachable, or the domain not pointing at the instance (run it in the same terminal, so `$LG` is still set):
        ```bash
        aws logs tail "$LG" --log-stream-name-prefix proxy --since 15m --region af-south-1
        ```
    - [x] Check HTTPS answers with `401` (no token, so refused, but over a valid certificate), and that plain HTTP redirects to HTTPS:
        ```bash
        curl -i https://turacochorus.literaturelounge.org/consent
        curl -I http://turacochorus.literaturelounge.org/consent
        ```

- [x] **8. Test the real login locally**
    - [x] Point your local frontend at the live Turaco Chorus (`frontend/.env.local` is gitignored):
        ```bash
        cd loggers-world/frontend
        echo "VITE_CHORUS_URL=https://turacochorus.literaturelounge.org" > .env.local
        npm run dev
        ```
    - [x] Open `http://localhost:5173`, sign in as a real user, and open the Wonder page
    - [x] Grant consent, view the stats, and ask a question. You should see real aggregates of your own entries and an answer
    - [x] If the browser console shows a CORS error, check that `AllowedOrigins` in `task-environment.local.json` includes `http://localhost:5173`, then redeploy with the command from step 6

- [x] **8a. Switch the Gemini model (found in step 8)**
    - `gemini-3.6-flash` returned `503 UNAVAILABLE` ("high demand") on every `/ask`, including a direct call to Google with the deployed key, so the key and the model name are fine but the model is overloaded. Testing the candidates directly: `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` returned `200`, `gemini-3.5-flash` returned `503`, and the 2.5 models returned `404` for this key.
    - [x] Add `"Gemini:Model": "gemini-3.5-flash-lite"` to `task-environment.local.json`
    - [x] Redeploy, then ask a question on the local Wonder page again:
        ```bash
        cd turaco-chorus/infra
        npx cdk deploy --no-validation TuracoChorusComputeStack
        ```

- [x] **9. Check the rate limit sees real clients**
    - The limiter depends on the proxy passing on each visitor's address, which has not been verified. This test needs no login and never reaches the AI provider, because the request is refused for having no token. It uses up about 25 of the 500 daily requests.
    - [x] From your normal connection, send 12 requests. Expect `401` ten times, then `429`:
        ```bash
        for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -X POST https://turacochorus.literaturelounge.org/ask -H "Content-Type: application/json" -d '{"question":"x"}'; done; echo
        ```
    - [x] Switch to another network (turn on your VPN, or use your phone's hotspot) and run the same command. Expect `401` again at the start, because that address has its own allowance
    - [x] If the second network is refused at once, the limiter is seeing the proxy's address and not the visitor's. Do not go on to step 11; copy both outputs to Claude

- [x] **10. Set the daily cap from the AI provider's quota**
    - [x] Look up the free-tier request quota for the model named by `InsightProvider` (Gemini: the rate limits in Google AI Studio; Claude: the limits in the Anthropic console). For `gemini-3.5-flash-lite` on 2026-10-14 it is 15 requests a minute, 250K tokens a minute and 500 requests a day. The limiter only has per-client and daily settings, no global per-minute one, so several clients at once could still hit the provider's 15 a minute.
    - [x] Add to `task-environment.local.json` a value comfortably below that daily quota, as strings, and optionally the per-minute limit. Chosen: 400 a day (the 500 default equals the quota, leaving no room for other calls such as manual tests) and 5 a minute per client (so three clients are needed to reach the provider's 15 a minute):
        ```json
        "RateLimiting:Ask:GlobalPerDay": "<number below the quota>",
        "RateLimiting:Ask:PerIpPerMinute": "10"
        ```
    - [x] Redeploy:
        ```bash
        cd turaco-chorus/infra
        npx cdk deploy --no-validation TuracoChorusComputeStack
        ```

- [x] **11. Turn it on in production**
    - [x] In the AWS Amplify console, open the Logger's World app, then App settings, Environment variables, and add `VITE_CHORUS_URL` with the value `https://turacochorus.literaturelounge.org` (menu labels may differ slightly)
    - [x] Start a new build of `main` so the value is baked in (Vite reads it at build time). In the console, open the `main` branch and redeploy its latest build
    - [x] Remove `http://localhost:5173` from `AllowedOrigins` in `task-environment.local.json`, then redeploy Turaco Chorus:
        ```bash
        cd turaco-chorus/infra
        npx cdk deploy --no-validation TuracoChorusComputeStack
        ```
    - [x] Delete the local test setting so your own dev server stops pointing at production:
        ```bash
        rm loggers-world/frontend/.env.local
        ```

- [x] **12. Confirm in production**
    - [x] On the live site, signed in as a normal user, check the Wonder link appears in the nav
    - [x] Grant consent, view the stats and ask a question
    - [x] Check the live site's browser console shows no CORS or mixed-content errors

- [x] **13. Tidy the docs (ask Claude)**
    - [x] Update `design-system.md` and the README, which say Chorus surfaces only appear when `VITE_CHORUS_URL` is set locally
    - [x] Mark this update done and write its Outcome section

## Testing

- Turaco Chorus: 11 Jest tests for the mode parsing and the guard, and unit tests for the limiter and its options. `cdk synth` in default mode is byte-identical to before, and in public mode shows the two open ports, the proxy container with its link and certificate volume, and no fake secret.
- The 429 behaviour was checked locally against the running app: requests beyond the limit return `429` with `Retry-After` and the JSON error body, ahead of authentication.
- Not verified until steps 6, 7 and 9: a live deploy, certificate issuance, the proxy forwarding the client address, and where the official Caddy image keeps its data. Step 9's two-network test is the check on the client address.

## Deployment

Frontend through Amplify on merge to `main`, plus the environment variable in step 11. Turaco Chorus infrastructure through your own `cdk deploy`; CI only redeploys the container image.

## Rolling back

- [ ] Return Turaco Chorus to the demo deployment (fake adapters, plain HTTP, the IP allow-list). Deleting the file is enough, because without it the defaults apply:
    ```bash
    cd turaco-chorus/infra
    rm config/deployment.local.json
    npx cdk deploy --no-validation TuracoChorusComputeStack
    ```
- [ ] Hide the Wonder page again: remove `VITE_CHORUS_URL` in the Amplify console's environment variables and redeploy `main`
- [ ] The allow-list needs its managed prefix list to still hold your current address; check the address before testing the demo (see Turaco Chorus's `artifacts/ecs-deployment.md`, "IP allow-list")

## Outcome

The Wonder page is live on the production site, served by Turaco Chorus over HTTPS (Caddy on the instance) with real Cognito identity and the real DynamoDB data. Checked on the live site on 2026-10-14: the nav link appears, consent, stats and questions work, and the console shows no CORS or mixed-content errors. The rate limit sees each visitor's own address (two networks each got ten `401`s then `429`s). The daily cap is 400 against a free-tier quota of 500, and the per-client limit is 5 a minute.

- The first `/ask` calls failed with a Gemini `503` ("high demand") on `gemini-3.6-flash`, which also has a free-tier limit of only 20 requests a day. The deployed key and model name were fine. Switching to `gemini-3.5-flash-lite` (`Gemini:Model`, step 8a) fixed it.
- The production build first had no Wonder link because `VITE_CHORUS_URL` was missing from Amplify's variables, and the rebuild had picked up an empty value. Adding it and rebuilding fixed it. Amplify's CLI listing of variable names (not values) found the gap.
- `localhost:5173` was in `AllowedOrigins` only for the local test and was removed in step 11.

## Follow-ups

Those below that are not specific to this update's deployment are carried into the roadmaps: Logger's World's `roadmap.md` (the trailing-slash `404`, the offline message, the `429` message) and Turaco Chorus's `roadmap.md` under "Provider reliability and answer quality" (retry, failure logging, wrong-year range, the "couldn't determine" wording, the default model, the global per-minute limit) and "Auditing" (rejected requests).

- Direct loads and refreshes of a client-side route behave differently with and without a trailing slash. On 2026-10-14 `curl` showed `/wonder` and `/dashboard` answering `301` to the same path with a trailing slash, and `/wonder/` and `/dashboard/` answering `404` while still returning the app's `index.html`, so browsers render the page but the network tab shows a `404`. In-app links (`/wonder`) navigate client-side and never hit this. Amplify's only custom rule is `/<*>` to `/index.html` as `404-200`, which should have turned that `404` into a `200`. Firefox also logged a `file:///` security error for `/dashboard/`. Not investigated further; it affects every route and is unrelated to Turaco Chorus.

- If the instance is replaced, Caddy asks for a new certificate; Let's Encrypt allows this at the expected rate.
- The single instance is down while it restarts during a deploy.
- The app does not log provider failures (the container log is empty when Gemini returns an error) and does not retry a `503`. Both are possible Turaco Chorus changes; a retry with short backoff would absorb brief blips, but not a sustained overload.
- With `gemini-3.5-flash-lite`, the model sometimes resolves a relative phrase to the wrong year even though the prompt states today's date. On 2026-10-14 "How active was I last week?" was answered for 5 to 11 Oct 2025, while "What did I log last week?" correctly used 5 to 11 Oct 2026. A possible fix is to check the extracted range against today's date in Turaco Chorus and reject or correct an implausible one.
- "I couldn't determine an answer" is also the reply when the range is correct but holds no data, or when the question asks for entry contents (only totals are shared). A reply that says the range had no entries would be clearer.
- A rejected `/ask` (rate limit) is not written to Turaco Chorus's audit log; this joins the existing audit-coverage gap on its roadmap.
- While Turaco Chorus is unreachable (a redeploy, or an outage), the Wonder page shows "You're offline", which blames the visitor's connection. A message that says the Wonder service is unavailable would be more accurate.
- The Wonder page shows the server's message for a 429. A friendlier message is a possible polish item.
