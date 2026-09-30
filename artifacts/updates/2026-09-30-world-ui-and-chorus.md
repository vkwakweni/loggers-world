---
title: "Update: Enticing UI and Turaco Chorus Integration"
status: done
started: 2026-09-30
completed: 2026-09-30
---

# Enticing UI and Turaco Chorus Integration

Fourth post-v1 update. Two linked goals: make Logger's World feel more inviting (visual identity, richer landing page and dashboard), and surface Turaco Chorus's consent-gated natural-language questions inside the real UI, replacing the throwaway panel from the unmerged [2026-09-05 trial](../../../turaco-chorus/artifacts/roadmap.md).

## Requirements & decisions

- Visual direction: keep the forest theme (greens, browns, cream), add life rather than redesign. Adds a webfont pairing and a real type scale (both deferred in `design-system.md`), a richer landing page, and a dashboard of cards with per-log-type icons and colours.
- Turaco Chorus is a separate service called directly from the browser, with no Logger's World backend changes, matching its own README.
- Integration is local-first: the frontend reads `VITE_CHORUS_URL`, and when unset, every Chorus surface (nav link, dashboard teaser, route) is hidden. The live `turacochorus.literaturelounge.org` deployment stays decoupled (HTTP-only, IP-restricted, fake adapters), so HTTPS and public exposure are a later step.
- Consent stays the gate: the Chorus page shows `/stats` (no consent needed) and only enables the ask box once consent is granted; revoking is one click.
- Frontend tests are still optional per the standing rule, but the Chorus client is pure enough to cover with Vitest, so it gets a small suite.

## Design

- `src/chorus.ts`: typed client (`getStats`, `getConsent`, `setConsent`, `ask`) reusing the `NetworkError` pattern from `api.ts`.
- `src/pages/Chorus.tsx`: consent card, stats bars per dimension, ask box with suggested questions, answer card with a "data used" provenance line.
- Dashboard: cards with icon and accent colour derived deterministically from the log type's name, field-count chip, and a Chorus teaser card when configured.

## Implementation checklist

- [x] Webfont pairing and type scale tokens
- [x] Landing page redesign
- [x] Dashboard cards and empty state
- [x] Page entrance motion (respecting `prefers-reduced-motion`)
- [x] Chorus client and tests
- [x] Chorus page (consent, stats, ask)
- [x] Nav link and dashboard teaser, gated on `VITE_CHORUS_URL`
- [x] Update `design-system.md`, `.env.example`, README
- [x] Dashboard cards: entry count and last-logged, fetched after first paint
- [x] Signed-out footer (brand, source link, licence credit) and centred auth pages
- [x] Landing preview strip of sample cards
- [x] Dismissible dashboard teaser (remembered in `localStorage`), copy reworked around a line-drawn bird icon and "wonder" wording, route `/wonder`, no service name anywhere in the UI
- [x] Display-only date format (`30 Sep 2026`) for date fields and the Wonder page, via `formatDate`; stored values stay `YYYY-MM-DD`
- [x] Category-over-time stacked chart on the Wonder page: one `/stats` call per week or month (`from`/`to`), stacked client-side, with legend, tooltip and table view; categorical colours validated against the app's light and dark surfaces
- [x] Friendlier message when the answer service returns its generic 500 (usually the AI provider being busy)

## Testing

`tsc -b`, `oxlint`, and `vitest run` must pass locally and in CI, plus a manual browser walkthrough against a locally run Turaco Chorus (`AllowedOrigins=http://localhost:5173`).

## Deployment

Frontend only, via Amplify on merge to `main`. `VITE_CHORUS_URL` stays unset in production until Turaco Chorus has HTTPS.

## Notes

- The category-over-time chart is a workaround for `/stats` returning each dimension independently. A real cross-dimension aggregate is recorded as a development item in Turaco Chorus's `roadmap.md` (under "Config & architecture ideas"), with the open design questions.
- Per-period calls use inclusive `from`/`to` bounds and non-overlapping periods, so counts add up. Period bounds are in the user's local calendar; Turaco Chorus compares them with the UTC date of each entry's `createdAt`, so an entry saved near midnight can land in the neighbouring period.

## Outcome

Merged as [PR #11](https://github.com/vkwakweni/loggers-world/pull/11) (eight commits kept by a rebase merge), CI and `cdk deploy` green on `main`. The dashboard and Wonder page were walked through signed in, against a locally run Turaco Chorus (consent, ask, stats, chart). One real failure along the way was a temporary Gemini `503`, not a bug here.

## Follow-ups

- The bird icon beside the Wonder page title looks awkward (see `roadmap.md`'s backlog).
- `VITE_CHORUS_URL` stays unset in production. Making the page usable publicly needs Turaco Chorus on HTTPS (an ALB with an ACM certificate), open access instead of the IP allow-list, and the real identity and log-data adapters instead of the fakes.
- Cross-dimension aggregates (category broken down by date) are a development item in Turaco Chorus's `roadmap.md`; the chart here is the interim workaround.
- Buying `loggersworld.app` (see `roadmap.md`'s backlog).
- Turaco Chorus answers come from Gemini's free tier today, which gave `503` and quota errors. Switching to Claude needs Anthropic API credits (cloud session credits do not pay for API keys); the adapter already exists.
