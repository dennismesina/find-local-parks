---
title: 'Story 1.1: Scaffold app and park data layer'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: '829f36088dff7e1a6fb53e66ff25e21c0f77a65d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/specs/spec-find-local-parks/park-data.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no app yet. Every later story needs a runnable Vite + React + Tailwind project, park data that cannot crash the UI, routes, a layout shell, and bundled park images.

**Approach:** Scaffold the app and fetch `parks.sample.json` from `public/` through a null-safe loader. The loader normalizes the data, sorts parks A–Z, numbers them 1–N and maps image URLs to bundled art. Wrap it in a loading/error/retry hook, and render landmark regions with placeholder content for routes `/` and `/parks/:id`.

## Boundaries & Constraints

**Always:** one `npm install` + `npm run dev`; no API keys; `requirements/parks.sample.json` copied byte-for-byte and never edited; normalization never fabricates values and never mutates the parsed source; nested reads null-safe; tokens, the Public Sans font and the amber focus ring come from `design/README.md`.

**Never:** list cards, details content, a map, or responsive layout work (Stories 1.2–1.5); geolocation; a component library; a static JSON import (it cannot fail, so the error state would be fiction; this decision came from the readiness gate).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | 12 sample parks | 12 parks sorted A–Z by name, `number` 1–12 | N/A |
| Missing nested field | Highland: no `location.address` | `address: null`, no throw | N/A |
| Null / empty fields | Old Mill `description: null`; Cedar Hill `images: []`, `rating: null` | stay `null` / `[]`; no defaults invented | N/A |
| Missing arrays | `amenities` or `images` absent | `[]` | N/A |
| Bad coordinates | lat/lng missing or non-finite | `hasCoords: false`; park kept | N/A |
| Image mapped | `https://images.example.com/prospect-1.jpg` | bundled `prospect-1.png` URL | N/A |
| Image unmatched | `https://x.test/zzz.jpg` | URL unchanged | `onError` fallback later (1.3) |
| Load fails | fetch rejects or returns non-OK | "Couldn't load parks. Try again." + Retry button | Retry refetches |
| Loading | fetch pending | "Loading parks…" | N/A |
| Unknown route id | `/parks/nope` | "Park not found" + link back to `/` | N/A |

</frozen-after-approval>

## Code Map

- Greenfield repo: only `README.md`, `.gitignore` (already ignores `node_modules`, `dist`; `public` is not ignored), `design/`, `requirements/`, and transcripts. Do not touch `design/screens`, `design/source`, the transcripts or `_bmad*`.
- `requirements/parks.sample.json` -- source data; copy it to `public/data/parks.sample.json`.
- `design/park-images/*.png` (12 files) -- `git mv` them to `src/assets/park-images/`; the stems match all 12 sample URLs.
- `design/README.md` -- tokens, font, focus-ring classes, landmark names, loading/error copy.
- Toolchain: Node 25, npm 11. Current releases: vite 8, @vitejs/plugin-react 6, tailwindcss + @tailwindcss/vite 4 (CSS `@theme`, no config file), react 19, react-router 8, vitest 5.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `vite.config.js`, `index.html` -- Vite + React + `@tailwindcss/vite`; scripts `dev`, `build`, `test` (`vitest run`); add the Vitest jsdom config and RTL setup; load Public Sans 400–800 from Google Fonts in `index.html`; set the title to "Find a Park".
- [x] `src/index.css` -- `@import "tailwindcss"`; put the `@theme` colour tokens and font from `design/README.md` here and define a `focus-ring` utility with the amber focus-visible outline.
- [x] `public/data/parks.sample.json` -- byte copy of the requirements file.
- [x] `src/assets/park-images/` -- moved pixel art.
- [x] `src/data/parks.js` -- `normalizePark`, `normalizeParks` (sort A–Z, assign `number`), `resolveImageUrl` (stem lookup via `import.meta.glob(..., { eager: true, query: '?url', import: 'default' })`), `loadParks()` (fetch `${import.meta.env.BASE_URL}data/parks.sample.json`, throw on non-OK). Normalized shape: `{ id, name, number, description, address, lat, lng, hasCoords, amenities, hours, images, acreage, rating }`. Use `null` for missing scalars and `[]` for missing arrays.
- [x] `src/data/useParks.js` -- hook returning `{ status: 'loading'|'error'|'ready', parks, retry }`.
- [x] `src/App.jsx`, `src/main.jsx` -- `BrowserRouter`; routes `/` and `/parks/:id`. The shell renders `<header>` (app name, park count once ready), `<main>`, `<aside aria-label="Parks">` (placeholder: the "All parks" heading on `/`; the park name, or "Park not found" with a link back, on `/parks/:id`) and `<section aria-label="Map of parks">` (placeholder). Loading and error states render inside the aside.
- [x] `src/data/parks.test.js`, `src/App.test.jsx` -- unit-test every I/O matrix row, including that the source object is not mutated; test the loading → error → retry → ready flow by mocking `fetch`.

**Acceptance Criteria:**
- Given a fresh clone, when `npm install` and `npm run dev` run, then the app serves locally with no keys.
- Given the app at `/parks/prospect-park`, when the user presses browser Back after navigating from `/`, then `/` renders again.
- Given `public/data/parks.sample.json`, when compared with `requirements/parks.sample.json`, then the bytes are identical.

## Implementation Notes

- vitest 4.1 + jsdom 29 instead of vitest 5 + jsdom 30: the latter declare engines that exclude Node 25 (odd release), so plain `npm install` on Node 25 picks v4/v29 and installs warning-free. Upgrade when on Node 24 LTS or 26.
- Park PNGs are under Vite's 4 KB inline limit, so `?url` yields data URIs in the production build (bundled, no separate files).
- Tests read the fixture with `process.cwd()` because jsdom gives `import.meta.url` an http scheme.
- Normalization also treats empty/whitespace strings as `null` and out-of-range `acreage` (< 0) as `null`; non-object entries are skipped.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| EC1 | Path matching no route (`/foo`, `/parks/`) renders an empty aside | medium | `<Routes>` in `src/App.jsx` has only `/` and `/parks/:id`; any other path leaves the Parks region blank with no way back | patch |
| EC2/BH8 | Park with `name: null` renders an empty `<h1>` | low | Real in `ParkDetailsPlaceholder`, but `park-data.md` treats `name` as required and all 12 have one; a fallback label would add a branch and risk inventing a value | reject (unlikely) |
| EC3/BH7 | Duplicate or missing `id` makes a park unreachable | low | `parks.find` returns the first; sample ids are unique and `id` is required per `park-data.md` | reject (unlikely) |
| EC4/BH9 | Header shows "1 parks" / "0 parks" | low | Sample always has 12; pluralization and an empty state add branches | reject (unlikely) |
| EC5 | Array entry passes `typeof === 'object'` and becomes a phantom park | low | True, but the data never contains nested arrays; the fix adds a guard | reject (unlikely) |
| EC6/BH4 | Stem-only image mapping would replace a real image with the same filename | low | Stem mapping is exactly what `park-data.md` specifies; only hypothetical future URLs hit it | reject (unlikely, by design) |
| EC7/BH1 | No AbortController or timeout; a hung fetch shows loading forever, StrictMode double-fetches | low | The `cancelled` flag prevents stale state; a same-origin static file is unlikely to hang; a timeout adds complexity | reject (unlikely) |
| EC8 | Sort test oracle uses a different `localeCompare` than production | low | No case or accent ties among sample names, so both orders agree | reject (unlikely) |
| BH2 | Focus is lost when Retry unmounts | low | Real, but only on the rare error path; focus management adds code; Story 1.5 does the a11y pass | reject (unlikely) |
| BH3 | `hasCoords` accepts out-of-range lat/lng | low | `finiteNumber` only; `lat: 200` gives `hasCoords: true`, which breaks the Story 1.4 markers; "valid lat/lng" in CAP-1 implies range. Direct correction of an existing guard | patch |
| BH5 | `text()` tests the trimmed value but returns the untrimmed string | low | Padded names would sort and number differently; the fix is a direct correction (return the trimmed value) | patch |
| BH6 | No tie-breaker in `byName` | low | No duplicate names in the sample; adding a sort key is extra logic | reject (unlikely) |
| BH10 | Normalization rules and the non-array load path are untested | — | Duplicate of VG1–VG3 | merged into VG |
| BH11 | Byte-identical AC is not automated | false | The spec's Verification uses `cmp`; it ran and passed | reject |
| BH12 | Load error reason is swallowed | low | Diagnostic only; the error UI works | reject (unlikely) |
| BH13 | No `engines` field makes install non-reproducible | false | `package-lock.json` pins versions; vitest 4 and jsdom 29 install cleanly on current Node lines | reject |
| BH14 | `document.title` is not updated per view; favicon 404 | low | Cosmetic; per-view titles fit the Story 1.5 a11y pass | reject (unlikely) |
| BH15 | No `<h1>` during loading or error | low | Transient state; a11y pass in 1.5 | reject (unlikely) |
| VG1 | Null-name ordering in `byName` is untested | medium | Pre-verified: removing the null guards passes all tests, but a nameless record would crash the load | patch |
| VG2 | Non-array payload rejection is untested | medium | Pre-verified: deleting the `Array.isArray` check makes corrupt data look like an empty set, and no test fails | patch |
| VG3 | Whitespace-to-null, `stringList` filtering and negative `acreage` are untested | medium | Pre-verified: simplifying `text()` or dropping `acreage >= 0` passes all tests | patch |
| VG-o | Image-mapping tests assert `.png`, but the build inlines data URIs | false | The tests run in vitest, where `?url` yields file URLs; mapping by stem is what is being tested, and the build passes | reject |

## Design Notes

The park `number` is assigned once at load time and shared by list cards and map markers (Stories 1.2 and 1.4), so it must not be recomputed per view. `rating` stays `null` when it is not a finite number in 0–5, so the UI can never show 0 stars by accident.

## Verification

**Commands:**
- `npm test` -- expected: all tests pass.
- `npm run build` -- expected: succeeds with no errors.
- `cmp requirements/parks.sample.json public/data/parks.sample.json` -- expected: no output.

**Manual checks (if no CLI):**
- `npm run dev`, then open `/` and `/parks/nope`: the landmarks are present, "Park not found" shows with its link, and Tab shows the amber focus ring on the link.
