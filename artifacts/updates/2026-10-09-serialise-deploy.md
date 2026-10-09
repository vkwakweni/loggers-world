---
title: "Update: serialise deploys"
status: in progress
started: 2026-10-09
---

# Serialise deploys

Sixth post-v1 update. Makes the `deploy` job in CI queue instead of running in parallel, so merging several PRs in quick succession no longer collides. Configuration only, no application code.

## Requirements & decisions

- Merging several PRs to `main` within minutes starts overlapping `cdk deploy` runs, and a later one fails with `Stack ... is in UPDATE_IN_PROGRESS state and can not be updated` (seen 2026-09-30 with six Dependabot PRs).
- The `deploy` job gets a `concurrency` group with `cancel-in-progress: false`: a running deploy is never interrupted, and the next one waits.
- GitHub keeps only the newest queued run and drops older pending ones. That is fine here, because each run deploys the tip of `main`, so the last one includes every earlier merge.
- Pull request runs are given their own one-off group (`no-deploy-<run id>`). The `deploy` job is skipped on PRs, and this keeps a skipped PR run from ever sitting in the queue ahead of a real deploy.
- Only the `deploy` job is serialised. `verify` still runs in parallel.

## Implementation checklist

- [x] Add the `concurrency` block to the `deploy` job in `.github/workflows/ci.yml`
- [ ] Merge to `main`
- [ ] Confirm with two quick merges that the second deploy waits and then succeeds
- [ ] Strike the "Serialise `cdk deploy` runs" item in `roadmap.md`'s backlog (that item is on the `docs/roadmap-backlog-notes` branch, not yet on `main`)

## Testing

There is no automated test for workflow configuration. The YAML parses, and the pull request's own CI run must show `verify` passing and `deploy` skipped. The real test is the first time two merges to `main` land close together.

## Deployment

None. Merging runs the usual CI and `cdk deploy`, which changes no infrastructure.

## Follow-ups

- If the one-off group for pull requests turns out to be unnecessary (a skipped job may never enter the queue at all), it can be simplified to `group: deploy`. It was kept because the safe form costs nothing.
