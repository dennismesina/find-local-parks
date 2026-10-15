# Epic 1 Context: Find a Park

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver a small, keyless web app (a 2-hour take-home) that lets a resident find a local park in the NYC-area sample set on a map or in a list and open its details, on phone or desktop, by mouse, touch, or keyboard, with missing data handled honestly. The interviewer must be able to run it with one install and one start command and judge it from the README. A modest app that works and is well explained beats an ambitious one with broken core features; stop at 2 hours and document what is unfinished.

## Stories

- Story 1.1: Scaffold app and park data layer
- Story 1.2: Park list with keyboard selection
- Story 1.3: Park details with missing-data handling
- Story 1.4: Map of parks synced with selection
- Story 1.5: Responsive and accessibility polish with design applied
- Story 1.6: Tests and submission README

## Requirements & Constraints

- **Cross-cutting (every story):** no geolocation ever requested; no credentials or API keys; never invent missing data; `parks.sample.json` is never edited (copied into the app byte-for-byte); keyboard focus always visible.
- The list plus details view must be a complete alternative to the map. All 12 parks appear in the list, including ones with missing fields; parks without valid lat/lng get no marker but stay in the list and details.
- Every one of the 12 parks renders; null/missing/empty fields are omitted or labelled, never crash the UI. Failed images degrade without a broken-image icon.
- A data-load failure shows an error message with retry, never a blank screen.
- At 375px and desktop widths, list → details → back works with no horizontal scroll.
- Unredacted AI transcripts (Claude Code, exported by the developer before each fresh story context, and Claude Design) and design files are part of the submission; the README must say where they live.
- Non-goals: backend, accounts, deployment, data editing. Search, filters, current location only if core is done with time to spare.
- Where the design and the spec disagree, the spec wins.

## Technical Decisions

- **Stack:** React + Vite, Tailwind CSS (mobile-first), `react-leaflet` + Leaflet with OpenStreetMap standard tiles (keyless, attribution visible), Vitest + React Testing Library. No component library.
- **Data loading (readiness decision):** the spec says static import, but loading/error/retry states require a mechanism that can actually fail. Use one that can (e.g. `fetch` from `public/` or a dynamic `import()`) and document the choice in the README.
- **Routing (readiness decision):** React Router. `/` is the list, `/parks/:id` is details (supersedes the design's `?park=` option). Unknown id shows "park not found" with a way back. Browser Back must work.
- **Data shape:** array of park objects with `id`, `name` (treat as required); `description`, `location.{lat,lng,address}`, `amenities` (kebab-case tokens), `hours` (free text, shown as written), `images` (URL array), `acreage`, `rating` (0–5) may each be missing, null, or empty. Read nested fields null-safely (`park.location?.address`).
- **Normalization:** one null-safe module applies safe defaults with no fabricated values, sorts parks A–Z and numbers them 1–N; that number is shared by list cards and map markers. Centralize fallback rules in a small helper (e.g. `display(value, fallback)`).
- **Image URL transformation:** pixel art moves from `design/park-images/` to `src/assets/park-images/`. At load time each image URL maps by filename stem to the bundled asset (`.../prospect-1.jpg` → `park-images/prospect-1.png`); unmatched URLs pass through unchanged so `onError` fallback still applies. Do not mutate source data. Document in README.
- **Amenity labels:** replace `-` with a space and capitalize the first letter (`dog-run` → "Dog run"); unknown tokens are humanized, never dropped.
- **Map:** initial view fits bounds of parks with coordinates. Leaflet default marker icons need explicit asset imports under Vite (or use `L.divIcon` with a `<button>` inside). Markers are focusable, named "N. Park name"; the selected marker is amber and larger.
- **Tailwind tokens:** paper `#F6F4EE`, surface `#FFFFFF`, line `#DAD6CB`, ink `#1B2620`, muted `#4F5B54`, forest `#1E5B3F` / dark `#123826`, tag bg `#E9EFE7` / fg `#23472F`, amber `#B45309`, missing bg `#F0EDE5` / line `#C9C4B6`. Font: Public Sans (Google Fonts, 400–800). Focus ring: `focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-amber focus-visible:outline-offset-2`.
- **Tests must cover** every known data gap (see UX section), a failing image, an unmatched image URL, the URL transformation without mutation, and the keyboard list → details → back flow.

## UX & Interaction Patterns

- **Landmarks:** `<header>`, `<main>`, `<aside aria-label="Parks">`, map region labelled "Map of parks". One `<h1>` per view; no clickable `<div>`s; icon-only buttons have `aria-label`s; touch targets ≥ 44×44px; text contrast ≥ 4.5:1.
- **Desktop (≥ 768px):** green header (app name "Find a Park", subtitle, park count); ~400px independently scrolling sidebar; map fills the rest. Selecting a park switches the sidebar to details, starting with an "All parks" back control.
- **Phone (< 768px):** single column with a List / Map toggle of two `<button>`s using `aria-pressed`, List default. Tapping a marker shows a preview card ("Park N of 12", name, address, hours, "View park details", close button "Close park preview"). Details take the full screen with an "All parks" back link.
- **Focus management:** opening details moves focus to the details heading; returning to the list moves focus to the originating card.
- **Park card:** single `<button>`/link per card (one Tab stop) in a `<ul>`; number badge, name (17px bold), address, first three amenities as tags plus "+N more".
- **Details order:** back control, photo area ("Photo 1 of N", alt text naming the park), name as `<h1>` (26–28px, 800), address, "Open in OpenStreetMap" link from lat/lng, `<dl>` fact tiles (Hours, Size in acres, Rating "4.7 / 5"), About, all amenities as checked tags.
- **Missing-data copy:** address → "Address not listed" (muted); description null → "No description has been provided for this park."; rating null → "Not yet rated" (never 0/empty stars); empty or failed images → dashed box "No photos for this park yet"; hours/acreage → "Not listed"; empty amenities → hide section or "No amenities listed"; no lat/lng → no marker, no OSM link. Missing fact tiles use the muted style (missing bg, dashed border, italic), as on the phone screen; the desktop mock's normal-style "Not yet rated" tile is a mistake.
- **Sample gaps:** Old Mill Botanical Garden (null description), Cedar Hill Nature Preserve (empty images, null rating; coordinates look like a placeholder, note in Known issues), East Ridge Trailhead (empty images), Highland Dog Park (missing address).
- **Loading/error states:** "Loading parks…" and "Couldn't load parks. Try again." with a retry button, using the card style.
- Visual reference: `design/screens/` (1280×800 and 390×844). `design/source/*.dc.html` is reference only, not app code.

## Cross-Story Dependencies

- 1.1 provides the data layer, routing, layout shell, tokens, and bundled images that all later stories build on.
- 1.2 needs the 1.3 back control for its focus-return-to-card criterion. **Readiness decision:** in 1.2, verify focus return using browser Back; 1.3 confirms it via the "All parks" control.
- 1.4 relies on the shared A–Z numbering from 1.1 and the selected-park route to highlight markers and open details.
- 1.5 is the full responsive/accessibility pass over 1.2–1.4 (which ship baseline accessibility).
- 1.6 tests cover behaviour from 1.1–1.3; the README records decisions from all stories, including the data-load mechanism and React Router choice.
