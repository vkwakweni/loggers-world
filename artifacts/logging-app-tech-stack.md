---
title: Technology Glossary
last-updated: 2026-07-18
---

# Tech Stack

| Layer | Technology | Free tier |
|---|---|---|
| Frontend framework | React (Vite) | Free (open source) |
| Frontend hosting | AWS Amplify Hosting | Always-free tier (build minutes + storage + transfer limits) |
| Backend runtime | Node.js + Express | Free (open source) |
| Compute | AWS Lambda (via Function URLs) | Always free — 1M requests/month, no expiry |
| Database | Amazon DynamoDB | Always free — 25GB storage, 25 RCU/WCU |
| Auth | Amazon Cognito | Always free — up to 50,000 MAUs |
| Infrastructure as Code | AWS CDK (TypeScript) | Free tool — only pay for what it provisions |
| CI/CD | GitHub Actions | Free (public repo) / 2,000 min/mo (private) |
| Source control | GitHub | Free |

## Tech glossary

* **AWS Amplify Hosting**: Static-site hosting with built-in CI — connects to your GitHub repo, builds on push, deploys to a CDN automatically. Used here to host and auto-deploy the React frontend on every merge to `main`.
* **AWS CDK (TypeScript)**: Infrastructure-as-code framework — define AWS resources (tables, functions, user pools) as TypeScript classes instead of clicking through the console; CDK synthesizes them into a CloudFormation stack. Used here to provision the entire backend (DynamoDB, Lambda, Cognito) as one versioned stack.
* **Amazon Cognito**: Managed auth service — handles user pools, sign-up/sign-in, and JWT issuance. Used here to gate the app per-user so each person's log types and entries are scoped to their own account.
* **Amazon DynamoDB**: Managed NoSQL document/key-value store. Used here as a single table holding both `LogType` records (user-defined schemas) and `LogEntry` records (a flexible `fields` map) — the centerpiece of the NoSQL story.
* **AWS Lambda (Function URLs)**: Serverless compute with a direct HTTPS URL, no API Gateway needed — code only runs (and only costs) per request. Used here to run the Express API that reads/writes DynamoDB.
* **GitHub**: Hosts the repo and triggers both Amplify (frontend) and Actions (backend) on push. Also where the portfolio README and live demo link live.
* **GitHub Actions**: CI/CD runner triggered by repo events. Used here to lint/test on every PR and run `cdk deploy` on merge to `main`.
* **Node.js + Express**: JS runtime and minimal web framework for the API layer. Used here to define REST endpoints (`/log-types`, `/entries`), packaged to run inside Lambda.
* **React (Vite)**: JS library for building UI as reusable components; Vite is the build tool/dev server. Used here for the whole frontend — the log-type builder, entry forms, and views.