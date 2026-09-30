---
title: "Update: Dependabot"
status: in-progress
started: 2026-09-30
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
- [ ] Merge to `main` (Dependabot only reads the config from the default branch)
- [ ] Confirm the first round of PRs arrives and CI runs on them
- [ ] Decide whether to enable Dependabot security updates in the repository settings (separate from this file)

## Testing

The YAML parses and lists the four ecosystems. The real test is the first scheduled run after merge: Dependabot reports config errors under the repo's Insights → Dependency graph → Dependabot tab.

## Deployment

None. The file only takes effect on `main`, and merging it runs the usual CI and `cdk deploy`, which changes no infrastructure.
