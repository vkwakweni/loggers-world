---
title: Retrospective
last-updated: 2026-07-27
---

# Retrospective

## Challenges

*What was harder than expected, and why. Point back to specific artifacts/commits where it's already documented (e.g. `infrastructure.md`'s Node version blocker) rather than repeating the detail here.*

- Unique usernames: I was conflicted on whether both email address and username should be unique Cognito alias attributes. However, the small-scale nature of this application meant that I limited to only unique email addresses.
    - I had initially made both unique, but changed the setting while the user pool still had zero real users. This was an important bug to catch, because otherwise it would have required migration or the deletion of real accounts.
- While wiring the actual API, I found that the CORS `addFunctionUrl()` functionality requires that the expected origins for calls and responses be explicitly listed.

## What I'd Change

*Decisions you'd make differently with hindsight — architecture, sequencing, scope.*

- There was a region problem for AWS Amplify: without support in Africa, the latency experienced for the frontend from having to route through Ireland adds overhead.
    - Otherwise, the static hosting was supported for Africa in Lambda, Cognito, and DynamoDB; therefore, API and auth calls remained low-latency.

## Resume Bullet Points

*2–4 short, metric-or-outcome-oriented lines suitable for pasting into a resume/portfolio.*

- Assembled a serverless AWS system spanning 6 services end-to-end (Amplify, Cognito, Lambda, DynamoDB, CDK, IAM) entirely within AWS's free tier.
- Designed and shipped a solo, 7-day full-stack serverless application, from requirements through production deployment.
- Implemented a GitHub Actions CI/CD pipeline that lints, runs 24 automated tests, and deploys infrastructure changes via CDK on every merge to `main`.

## Further Development

See [`roadmap.md`](roadmap.md)'s [Later / Further Development](roadmap.md#later--further-development) section for the running list of deferred features and known gaps.
