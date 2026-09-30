---
title: "Update: Dependabot"
status: done
started: 2026-09-30
completed: 2026-09-30
---

# Dependabot

Fifth post-v1 update. Adds GitHub's Dependabot so outdated dependencies surface as PRs instead of going unnoticed. Configuration only, no application code.

## Requirements & decisions

- Watched: `/backend`, `/frontend` and `/infra` (each has its own lockfile) plus the GitHub Actions in `.github/workflows`. Nothing is watched at the repo root, which has no `package.json`.
- Weekly schedule, minor and patch updates grouped into one PR per ecosystem, at most three open PRs each. Every merge to `main` runs `cdk deploy`, so batching keeps the number of deploys down.
- Major version bumps are ignored. Several dependencies are on very new majors (React Router, Vite, TypeScript), and the frontend has no component tests, so a green CI does not prove a major upgrade is safe. Majors are reviewed by hand.
- Dependabot PRs go through the same CI as any other PR and must be green before merging.
- PR titles are prefixed `deps`, with a `dependencies` label.

## Implementation checklist

- [x] Add `.github/dependabot.yml` for the three npm folders and GitHub Actions
- [x] Merge to `main` (Dependabot only reads the config from the default branch)
- [x] Confirm the first round of PRs arrives and CI runs on them
- [ ] Decide whether to enable Dependabot security updates in the repository settings (separate from this file): still open, see Follow-ups

## Testing

The YAML parses and lists the four ecosystems. The real test is the first scheduled run after merge: Dependabot reports config errors under the repo's Insights → Dependency graph → Dependabot tab.

## Deployment

None. The file only takes effect on `main`, and merging it runs the usual CI and `cdk deploy`, which changes no infrastructure.

## Outcome

Merged as [PR #12](https://github.com/vkwakweni/loggers-world/pull/12). Dependabot opened six PRs within minutes (three Actions bumps, three grouped npm updates), all merged the same day.

- The config asked for a `dependencies` label the repo did not have, so Dependabot commented an error on each PR. Fixed by creating the label and applying it to the open PRs; the stale comments remain on the merged PRs.
- `@dependabot recreate` answers with a 👍 reaction and a force-push of the branch, not a comment.
- Merging all six within about two minutes started overlapping `cdk deploy` runs, and the last failed with `UPDATE_IN_PROGRESS`; a manual re-run succeeded.

## Follow-ups

- Serialise `cdk deploy` with a `concurrency` group on the `deploy` job in `ci.yml` (see `roadmap.md`'s backlog) before the next weekly batch of PRs. Until then, merge deploy-triggering PRs one at a time.
- Decide on enabling Dependabot security updates (repository settings; currently disabled). The `semver-major` ignore rules affect version updates only, so security fixes needing a major bump would still be offered.
- Major Actions bumps are not ignored on purpose; `configure-aws-credentials` is the one that can break `deploy`, so read its release notes before merging.
