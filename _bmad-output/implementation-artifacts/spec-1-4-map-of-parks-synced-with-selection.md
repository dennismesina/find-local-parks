---
title: 'Story 1.4: Map of parks synced with selection'
type: 'feature'
created: '2026-10-14'
baseline_commit: '529d0bc194228df30a91143d27d7c21b56c2b484'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The "Map of parks" region is a "Map coming soon." placeholder. Residents cannot see where the parks are or pick one by location.

**Approach:** Render a react-leaflet map with OpenStreetMap tiles, fitted to the parks that have coordinates. Each such park gets a numbered, focusable marker that uses the loader's `number`. The park on `/parks/:id` has an amber, larger marker. At ≥ 768px, activating a marker navigates to `/parks/:id`. At < 768px it opens a preview card instead.

## Boundaries & Constraints

**Always:** use loader `number`/order unchanged; `hasCoords` decides which parks get markers; visible OSM attribution; one Tab stop per marker, a real `<button>`, name "N. Park name", `focus-ring`; touch targets ≥ 44px; preview copy shows a missing address as "Address not listed" and missing hours as "Hours not listed"; no API keys.

**Never:** geolocation (`navigator.geolocation`, `locate()`); a desktop two-column sidebar, a phone List/Map toggle, or any layout restyling (Story 1.5); details content (Story 1.3); panning the map on selection; editing `parks.sample.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | 12 sample parks at `/` | 12 marker buttons named "1. …" to "12. …", none amber | N/A |
| Selected | `/parks/prospect-park` | Prospect Park's marker amber and larger; all others forest | N/A |
| No coords | a park with `hasCoords: false` | no marker; still in the list | N/A |
| Desktop activate | ≥ 768px, click or Enter on a marker | URL `/parks/:id`, park heading in aside | N/A |
| Phone tap | < 768px, tap marker 8 | preview: "Park 8 of 12", name, address, hours, "View park details", "Close park preview"; marker 8 amber; URL unchanged | N/A |
| Preview missing address | < 768px, Highland Dog Park | "Address not listed" (muted) | N/A |
| Preview → details | press "View park details" | navigates to `/parks/:id` | N/A |
| Preview close | press "Close park preview" | preview gone; focus back on that marker | N/A |
| Not loaded | loading or error | map region shows no map | N/A |

</frozen-after-approval>

## Code Map

- `src/App.jsx` -- shell; the `<section aria-label="Map of parks">` placeholder is replaced. The map renders outside `<Routes>`, so App reads the selected id with `useMatch('/parks/:id')`. Keep `ParksPanel`, `ParkDetailsRoute`, `lastParkId`, the landmarks and the loading/error states as they are.
- `src/data/parks.js` -- park fields used: `id`, `name`, `number`, `address`, `hours`, `lat`, `lng`, `hasCoords`. Do not change it.
- `src/index.css` -- tokens `forest`, `amber`, `surface`, `muted`, `line`, and the `focus-ring` utility; Tailwind classes inside divIcon HTML strings are picked up only if the literal class names appear in a scanned source file.
- `src/App.test.jsx` -- `renderAt`, `okResponse`, and `TestNav`; extend these. jsdom has no `matchMedia`, so stub it per test.
- `design/screens/02-desktop-park-selected.png`, `05-phone-map-selected.png` -- marker and preview visuals: white-ringed forest number circles (selected: amber, ~1.3×); a white card at the bottom of the map with an amber "Park N of 12", forest full-width button and round close "×".
- Versions: `leaflet@^1.9.4`, `react-leaflet@^5.0.0` (peer React 19).

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add `leaflet`, `react-leaflet`.
- [x] `src/data/useIsDesktop.js` -- `useIsDesktop()`: `matchMedia('(min-width: 768px)')` with a change listener. If `matchMedia` is missing, return `true`.
- [x] `src/components/ParkMap.jsx` -- `ParkMap({ parks, selectedId, isDesktop, onActivate })`: `MapContainer` with `bounds` from the parks that have coordinates (fixed NYC centre if none), a `TileLayer` for OSM standard tiles with its attribution, and one `Marker` per park with `L.divIcon` HTML `<button type="button" class="… focus-ring">` holding an `aria-hidden` number and an `sr-only` "N. Name". Set `keyboard: false` on the marker so the button is the only Tab stop. Selected markers are amber, larger and have a higher `zIndexOffset`. Import `leaflet/dist/leaflet.css`.
- [x] `src/components/ParkPreview.jsx` -- the preview card. Its name is an `<h2>`. It has a "View park details" `<Link>` and an `aria-label="Close park preview"` button. On mount, focus moves to the card. On close, focus returns to the marker button.
- [x] `src/App.jsx` -- wire it up: `selectedId` comes from the route. Keep `previewId` in state, used only below 768px, and clear it on navigation or when switching to desktop. The highlighted id is `selectedId ?? previewId`. Activation navigates on desktop and sets `previewId` on phone. Give the map section an explicit height so Leaflet can render. Render no map before `ready`.
- [x] `src/components/ParkMap.test.jsx`, `src/App.test.jsx` -- test every matrix row, that Tab reaches each marker button, that the attribution text is present, and that `navigator.geolocation` is never called.

**Acceptance Criteria:**
- Given the app loads, when the map renders, then OSM tiles and the "OpenStreetMap" attribution show, the view fits the coordinate bounds, and no location is requested.
- Given a keyboard user, when they Tab into the map, then each marker button receives focus once, with the amber `focus-ring`.
- Given a production build, when markers render, then no broken default marker icon appears (divIcon only).

## Implementation Notes

- Marker focus return after "Close park preview" is driven by a `focusId`/`onFocused` pair on `ParkMap`: closing changes the highlight, react-leaflet then swaps the marker's divIcon (replacing its DOM), so the map focuses the new button in an effect that runs after the markers' own effects. Icons are memoised per park and state so unrelated renders never replace marker DOM.
- `ParkMap` accepts `isDesktop` per the contract but renders identically at every width; App decides what activation does.
- The preview is a `<section tabIndex=-1 aria-labelledby>` overlaid at the bottom of the map (`z-[1001]`, above Leaflet controls; `bottom-8` keeps the attribution visible). Escape also closes it.
- Map wrapper is `relative isolate h-[480px]` inside the section; the section lost `flex-1` (layout is otherwise unchanged; 1.5 restyles).
- Existing details tests used `document.querySelector('img')`; OSM tile `<img>`s now exist, so those queries are scoped to the details `<article>`.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG) of `529d0bc..working tree` (excluding `package-lock.json` and `_bmad-output/`).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| VG1/BH6a | Escape-to-close on the preview is untested | medium | Pre-verified: deleting `onKeyDown` in `ParkPreview.jsx` passes the suite | patch |
| BH1/EC5 | Viewport crossing to desktop unmounts a focused preview; focus drops to `<body>` | low | The `isDesktop` effect clears `previewId` without setting `focusMarkerId`, unlike `closePreview`; a one-line correction | patch |
| BH4 | Tile URL uses deprecated `{s}.tile.openstreetmap.org` subdomains | low | OSM tile policy asks for `tile.openstreetmap.org` without subdomains; direct correction of the constant | patch |
| EC3 | Desktop: activating the already-selected marker pushes a duplicate history entry | low | `activateMarker` navigates unconditionally; clicking the amber marker is a plausible action and Back then seems to do nothing | patch |
| BH2 | Map region empty during loading/error | low | Matrix row "Not loaded → map region shows no map" is the frozen intent; the aside carries the loading/error message | reject (by design) |
| BH3 | `isDesktop` passed to `ParkMap` but unused | low | Real, but the prop is in the spec's task signature; removing it edits the spec, and it causes no runtime harm | reject |
| BH5 | Map never pans to the selected park; bounds not recomputed | false | "Panning the map on selection" is a frozen Never; parks data does not change after `ready` | reject (out of scope) |
| BH6b | Second-marker swap and Back-clears-preview untested | low | Back/navigation clearing is covered by the "View park details" test via the same `location.key` effect; swap is a `key` remount | reject (unlikely) |
| BH7 | Focus effect lists unused `selectedId`; `onFocused` runs when no button found | low | Extra dep only re-runs an early-returning effect; the closed preview's park always has a marker (preview only opens from one) | reject |
| BH8/EC6 | `mql.addEventListener` missing in Safari < 14 | low | Safari 13 (2019) is far outside the target; a fallback adds a branch | reject (unlikely) |
| BH9 | Map lost `flex-1`, fixed 480px height | low | Spec task requires an explicit height; Design Notes leave layout to Story 1.5 | reject (by design) |
| BH10 | No sr "Address:" prefix; amber small text contrast unchecked | false | Amber `#B45309` on white is ≈ 5.0:1, above 4.5:1; address needs no label to be understood | reject |
| BH11 | Review diff omits lockfile, spec and sprint-status | false | Deliberate: the spec is the claims file; `npm install` and the build resolved `react-leaflet@5` against React 19 cleanly | reject |
| EC1 | Null or duplicate park `id` collides keys / `/parks/null` | low | `id` is required; sample ids unique; same call as 1.1 EC3 and 1.2 BH2 | reject (unlikely) |
| EC2 | Ids with `/ ? # %` need `encodeURIComponent` | low | All sample ids are kebab-case; same call as 1.2 | reject (unlikely) |
| EC4 | Phone: re-tapping the open preview's marker leaves focus on the marker | low | Real, but the preview is already visible; refocusing needs a counter/key bump | reject (unlikely) |
| EC7 | Null park name → empty preview `h2` | low | `name` required; all 12 have one; same call as 1.1 EC2 | reject (unlikely) |

## Design Notes

**Marker as divIcon `<button>`:** a native button gives the name and Enter/Space for free, and Leaflet fires the marker `click` from the bubbling DOM click. `keyboard: false` keeps the wrapper div out of the Tab order. No default icon means no broken Vite icon paths.

**Layout before 1.5:** the map stays stacked under the aside at every width. Story 1.5 adds the sidebar and the List/Map toggle. Phone vs desktop behaviour is decided by viewport, not by layout, so 1.5 only restyles.

**Story 1.3 is merged:** `/parks/:id` renders `ParkDetailsRoute` → `ParkDetails`, which focuses its h1 on mount. A desktop marker activation therefore lands focus on the details heading.

## Verification

**Commands:**
- `npm test` -- expected: all tests pass.
- `npm run build` -- expected: succeeds with no errors.

**Manual checks (if no CLI):**
- `npm run dev`: tiles, attribution and 12 markers show; desktop click opens details with an amber marker; at 375px a tap shows the preview; no location prompt.
