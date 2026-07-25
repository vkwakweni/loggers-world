---
title: Design System
last-updated: 2026-07-25
status: Day 5 styling pass complete — see "Scope for today"
---

# Design System

Planning doc for visual/UX consistency across _Logger's World_. Lists everything that could be standardized; not all of it needs to be built today — see "Scope for today" at the bottom once we've narrowed it down.

## Pages inventory

Current routes (`App.tsx`), matching the wireframes:

| Page | Route | Auth |
|---|---|---|
| Landing | `/` | public only |
| Sign Up (+ confirm code) | `/signup` | public only |
| Log In | `/login` | public only |
| Dashboard | `/dashboard` | protected |
| Profile | `/profile` | protected |
| Log Type Builder | `/log-types/new` | protected |
| Log Type Entries (list) | `/log-types/:typeId` | protected |
| Add Entry | `/log-types/:typeId/entries/new` | protected |
| Edit Entry | `/log-types/:typeId/entries/:createdAt/edit` | protected |

## Typography

- **Font family**: currently `system-ui, 'Segoe UI', Roboto, sans-serif` (`--sans` in `index.css`) — no custom webfont loaded. Decide: keep system font (fast, native feel, zero load cost) or adopt a specific typeface?
- **Type scale**: only `h1`/`h2` are styled today (56px/24px, from the Vite template). Needs a full scale: `h1`–`h3` (or however many heading levels the pages actually use), body text, small/caption text (e.g. for form hints, error messages, timestamps).
- **Weight**: currently just one weight (500 for headings). Decide if body copy needs a distinct weight, and whether bold/emphasis is used anywhere (e.g. required-field indicators).
- **Color**: `--text` (body) / `--text-h` (headings) already exist and already respond to light/dark via `prefers-color-scheme`. Question is whether more roles are needed (e.g. muted/secondary text for hints, link color, error-text color — currently error `<p role="alert">` has no color at all).

## Icons

Currently zero icons anywhere in the app — every action is plain text (`"Edit"`, `"Delete"`, `"Sign out"`, `[+]` in wireframes is just a "New Log Type" text link). Where icons would plausibly help legibility/scannability:

- **Per-field-type icons** in the Log Type Builder / entry forms (text vs. number vs. date) — helps users scan a schema at a glance
- **Log type icons**: wireframe shows `[Books]`, `[Workouts]` as pseudo-icons — could be a user-chosen icon per log type, or an auto-picked one, or skipped entirely
- **Entry list actions**: Edit (pencil), Delete (trash) — currently plain text buttons
- **Nav / profile**: profile/account icon, sign-out icon
- **Status/feedback**: error icon next to `role="alert"` messages, loading spinner (currently just literal "Loading..." text)

Needs a decision: hand-rolled SVGs, an icon font, or a library (e.g. lucide-react, Material Symbols)? None currently installed.

## Colors

Current palette (`index.css`), inherited unmodified from the Vite React template:

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#fff` | `#16171d` |
| `--text` | `#6b6375` | `#9ca3af` |
| `--text-h` | `#08060d` | `#f3f4f6` |
| `--border` | `#e5e4e7` | `#2e303a` |
| `--accent` | `#aa3bff` | `#c084fc` |
| `--accent-bg` | `rgba(170,59,255,.1)` | `rgba(192,132,252,.15)` |
| `--code-bg` | `#f4f3ec` | `#1f2028` |

Not yet defined: **error/destructive** color (Delete buttons, validation messages currently unstyled), **success** color (e.g. after a save), **disabled** state color (submit buttons already use `disabled` but no visual treatment).

Open question raised: should this move toward **Material Design 3** conventions (`primary`/`on-primary`, `surface`/`on-surface`, `error`/`on-error`, tonal elevation, etc.) instead of the current ad hoc token set? That's a bigger structural change than just picking new hex values — worth deciding deliberately rather than drifting into it.

## Common features

- **Header/nav**: exists (`<Nav>` in `App.tsx`), currently unstyled bare links, swaps content based on auth state. Needs: visual treatment, active-route highlighting, possibly a logo/wordmark.
- **Footer**: doesn't exist yet. Decide if one's needed at all (portfolio project, single-page-app feel may not want one) — if yes, what goes in it (nothing functional depends on it today).
- **Menus**: only the top nav currently. No dropdown/overflow menus exist (e.g. a profile dropdown vs. the current dedicated `/profile` page link) — decide if that's ever needed or if the current flat structure is fine.
- **Forms**: currently bare `<label>`/`<input>` pairs, inconsistent spacing (some use `<br>` tags as a Day-4-era shortcut). Needs a real consistent pattern.
- **Tables**: only one so far (entry list) — bare `<table>`, no styling.
- **Buttons**: no distinction yet between primary (submit), secondary (cancel/back), and destructive (delete) actions — all render identically.
- **Empty/loading/error states**: exist functionally (`"Loading..."`, `"No entries yet."`, `role="alert"` text) but are unstyled placeholders.

## Scope for today

Done, in order:

- **Color tokens**: added `--error`/`--error-bg`, `--success`/`--success-bg`, `--disabled`, plus `--on-accent`/`--on-error` (theme-aware text-on-fill, catches the case where a token that's a light pastel in dark mode gets used as a solid button fill). Palette moved from the inherited purple Vite-template scheme to a forest theme (greens/browns/cream) per request, with light-mode `--bg` deliberately saturated (`#f2e8cf`) rather than near-white so it reads as cream on typical displays.
- **Icons**: installed `lucide-react`. Added icons to Edit/Delete (entry table), nav links (Dashboard/Profile/Landing/Sign Up/Log In), sign-out, "New Log Type"/"Add entry" (`Plus`), and error/success/loading status messages (`AlertCircle`/`CheckCircle2`/spinning `Loader2`).
- **Nav**: switched `Link` → `NavLink`, styled via `[aria-current="page"]` for active-route highlight; right-aligned; added the dark/light `ThemeToggle`.
- **Forms**: replaced `<br>`-based spacing with flex/gap on `<form>` and `<label>`; checkbox labels stay inline via `:has()`; Log Type Builder's per-field row uses a `.field-row` flex-wrap class.
- **Tables**: bordered grid, bold header row, row hover, inline icon+label alignment in action cells.
- **Buttons**: `button[type="submit"]` auto-styled primary (solid accent fill); plain `<button>` defaults to a neutral secondary look; `.btn-danger` for destructive actions (Remove field, Delete entry); `.btn`/`.btn-primary` classes for `<Link>`s that act like buttons.
- **Dark/light toggle**: `data-theme` attribute + `localStorage`, overriding the OS-driven `prefers-color-scheme` default; token blocks duplicated under `:root[data-theme="dark"]`/`:root[data-theme="light"]`.
- **Empty/loading/error/success states**: shared `StatusMessage` component (`ErrorMessage`/`Notice`/`LoadingMessage`) used everywhere instead of ad hoc `<p role="alert">`/`"Loading..."` text; `.empty-state` class for "No entries/log types yet." (muted, italic).
- **Dashboard/Profile layout**: `.page`/`.page.wide` wrapper for consistent max-width/padding; Profile's attributes moved from a bare `<ul>` to a bordered `.profile-attrs` card with divided label/value rows; Dashboard's dead "My Log Entries" placeholder section removed (cross-type entry timeline stays a "Later" item); Dashboard widened to match the table pages.
- **Landing page**: added a CC0 log-wood SVG (from SVGRepo, converted to a `LogWoodIcon` component with `fill="currentColor"` so it themes with `--accent`) below the title, with Sign Up/Log In as primary/secondary buttons.
- **Global link color**: base `a` rule using `--accent`, for the previously-unstyled inline links (e.g. "Already have an account?").
- **404 page**: catch-all route, `AxeLogIcon` (second CC0 SVGRepo asset, same `currentColor` conversion pattern as the landing page's `LogWoodIcon`), links back to Dashboard (if authenticated) or Landing.

Explicitly deferred (still open in the sections above, not done today):
- Per-field-type icons in the builder/entry forms, log-type icons
- Footer, profile dropdown/menu
- Material Design 3 token restructure (kept the existing ad hoc token set)
- A full typographic scale beyond `h1`/`h2` (still just the two Vite-template sizes)
