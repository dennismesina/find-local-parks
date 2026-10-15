# Find a Park

A small web app that helps residents find a local park in the NYC-area sample data, on a map or in a list, and open its details. Built with React + Vite as a 2-hour take-home.

No API keys, no geolocation: the app never asks for the resident's location, and every service it uses is keyless.

## Run

Requires Node.js 22.22 or newer (React Router 8 requires it) and npm; developed on Node 25.

```sh
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other commands:

```sh
npm test        # Vitest + React Testing Library, single run
npm run build   # production build into dist/
```

## What works

- **Data load with loading, error and retry states.** "Loading parks…" while the JSON loads; "Couldn't load parks. Try again." with a Retry button if it fails, never a blank screen.
- **List of all 12 parks**, A–Z and numbered 1–12, including the ones with missing fields. Each card is one link (one Tab stop) with a number badge, name, address (or "Address not listed") and the first three amenities plus "+N more".
- **Keyboard selection.** Tab to a card, Enter opens its details, focus moves to the details heading; "All parks" (or browser Back) returns to the list with focus on the card you came from.
- **Desktop layout (≥ 768px):** green header with the park count, a 400px sidebar that scrolls on its own (list, or details with an "‹ All parks" link), and the map filling the rest of the screen.
- **Phone layout (< 768px):** one column with a List / Map toggle (two buttons with `aria-pressed`, List by default). Details take the full screen with "‹ All parks" in the header. Back from details returns to the tab you came from: the List tab with focus on the card, or the Map tab with focus on the marker.
- **Park details** at `/parks/:id`: "All parks" back link, photo ("Photo 1 of N"), name, address, "Open in OpenStreetMap" link, Hours / Size / Rating tiles, About, and all amenities. Unknown ids show "Park not found" with a link back.
- **Missing data handled honestly**, never invented: "Address not listed", "No description has been provided for this park.", "Not yet rated" (never 0 stars), "Not listed" for hours and acreage, "No amenities listed", a dashed "No photos for this park yet" box for empty or failing images, and no marker or OSM link for a park without coordinates.
- **Map of parks** (Leaflet + OpenStreetMap tiles, attribution visible). The initial view fits all parks with coordinates. Each marker is a focusable button named "N. Park name", sharing the list's numbering; the selected park's marker is amber and larger.
  - Desktop (≥ 768px): clicking or pressing Enter on a marker opens that park's details.
  - Phone (< 768px): tapping a marker opens a preview card ("Park N of 12", name, address, hours, "View park details", "Close park preview"); Escape or the close button returns focus to the marker.
- **Accessibility:** a visible amber focus ring and a 44×44px minimum target on every interactive element, including Leaflet's zoom buttons; landmarks (header, main, "Parks" sidebar, "Map of parks" region); exactly one `<h1>` per view, including loading, error and "Park not found"; `document.title` is "Find a Park" on the list and "{Park name} · Find a Park" on details; no clickable `<div>`s or `<span>`s.
- **Design applied** from `design/screens/` (tokens, Public Sans, sizes and spacing), with no horizontal scroll at 375px.

## Left out

- Search, filters and "near me" / current location (non-goals unless the core was done with time to spare; current location is deliberately never requested).
- Backend, accounts, hosted deployment, editing park data (non-goals).
- More than one photo per park: details show the first photo only, labelled "Photo 1 of N".
- Panning the map to the selected park.

## Decisions

- **Stack:** React + Vite, Tailwind CSS (mobile-first, design tokens in `src/index.css`), `react-leaflet` + Leaflet, Vitest + React Testing Library. No component library. Vitest 4 / jsdom 29 rather than the latest majors, because those declare engines that exclude Node 25.
- **Data load via `fetch`:** the planning spec said "static import", but a static import cannot fail, so it cannot show loading, error and retry states. The JSON is served from `public/data/parks.sample.json` and loaded with `fetch` (`src/data/parks.js`), then normalized once: null-safe, sorted A–Z, numbered 1–N. That number is shared by list cards and map markers.
- **Routing: React Router**, `/` is the list and `/parks/:id` is details. Details are linkable and browser Back works. This supersedes the `?park=` option in `design/README.md`.
- **Map: OpenStreetMap standard tiles** from `tile.openstreetmap.org` (keyless, attribution visible), and **`L.divIcon` markers** that contain a real `<button>`. A button gives an accessible name and Enter/Space for free, and divIcons avoid Leaflet's default marker images, which break under Vite without extra asset imports.
- **Phone vs desktop marker behaviour** is decided by viewport (`matchMedia('(min-width: 768px)')`): desktop opens details, phone opens a preview first so the map stays in view.
- **Focus return** uses the last-opened park id kept in App state (not router state), so it also works with browser Back.
- Where the design and the spec disagreed, the spec won (for example, missing fact tiles always use the muted dashed style).

## Assumptions

From `_bmad-output/specs/spec-find-local-parks/SPEC.md`:

- The municipality is the NYC-area set implied by the sample coordinates; the app is titled generically ("Find a Park").
- Parks without valid lat/lng still appear in the list and details, just without a marker.
- A data-load failure shows an error message, not a blank screen.

## Data changes

- **`parks.sample.json` is unchanged.** It is copied byte-for-byte from `requirements/parks.sample.json` to `public/data/parks.sample.json`. No fields were added and the schema was not extended.
- **Image URL transformation (at load time, in memory):** the sample image URLs point at `images.example.com`, which does not resolve. Each URL is mapped by filename stem to bundled pixel art in `src/assets/park-images/` (for example `https://images.example.com/prospect-1.jpg` → `src/assets/park-images/prospect-1.png`). A URL with no matching asset passes through unchanged, so the image-failure fallback still applies. The source data is not mutated. See `resolveImageUrl` in `src/data/parks.js`.

## Known issues

- **Cedar Hill Nature Preserve's coordinates look like a placeholder.** `40.7128, -74.006` is the commonly used "New York City" default point (near City Hall), not a nature preserve. It is plotted as given; not corrected.
- **OpenStreetMap tile usage policy:** the app loads tiles straight from `tile.openstreetmap.org`. That is fine for review and light use, but the OSM tile policy does not allow heavy or public production traffic. A public launch needs a tile provider or self-hosted tiles.
- `npm test` prints jsdom "Not implemented: Window's scrollTo() method" notices from React Router's scroll handling. They are console noise, not errors or failures.

## How it was checked

**Automated tests** (`npm test`: all passing, no unhandled errors). Each Story 1.6 acceptance criterion maps to a named test:

| What is covered | Test (file › name) |
|---|---|
| Old Mill: null description | `src/App.test.jsx` › Park details › "shows the description fallback for a null description" |
| Cedar Hill: empty images | `src/App.test.jsx` › Park details › "shows the no-photo box and no &lt;img&gt; for cedar-hill-nature-preserve" |
| Cedar Hill: null rating | `src/App.test.jsx` › Park details › "shows "Not yet rated" in the muted tile for a null rating, never 0" |
| East Ridge: empty images | `src/App.test.jsx` › Park details › "shows the no-photo box and no &lt;img&gt; for east-ridge-trailhead" |
| Highland: missing address | `src/App.test.jsx` › Park details › "shows "Address not listed" in muted text for a missing address" (also in Park list, and `src/data/parks.test.js` › "sets a missing nested address to null without throwing (Highland)") |
| An image that fails to load | `src/App.test.jsx` › Park details › "replaces a failing image with the no-photo box" |
| An unmatched image URL | `src/App.test.jsx` › Park details › "passes an unmatched image URL through and falls back when it fails"; `src/data/parks.test.js` › resolveImageUrl › "passes an unmatched URL through unchanged" |
| Keyboard flow: Tab to a card, Enter, heading focused, "All parks" returns focus to the card | `src/App.test.jsx` › Park details › "keyboard only: Tab to a card, Enter, heading focused, "All parks" returns focus to the card" |
| Image URL transformation | `src/data/parks.test.js` › resolveImageUrl › "maps a sample URL to the bundled png with the same stem" and "maps every sample image URL" |
| …without mutating the source data | `src/data/parks.test.js` › normalizeParks › "does not mutate the parsed source" (deep-frozen input) |
| Every sample park renders without "null"/"undefined"/"NaN" | `src/App.test.jsx` › Park details › "renders every sample park without null/undefined/NaN and with one h1" |
| Park → park without passing through the list | `src/App.test.jsx` › Map on desktop › "moves from a park with a failed image straight to another park via its marker" |
| No geolocation | `src/App.test.jsx` › Map of parks › "never calls navigator.geolocation"; `src/components/ParkMap.test.jsx` › "never requests the user location" |

Other tests cover the loading → error → retry flow, "Park not found", browser Back focus return, marker naming, numbering and highlighting, phone preview open/close/Escape, the phone List / Map toggle, phone Back from details to the right tab, the header, one `<h1>` per view, `document.title`, the map resizing when its pane is shown, and the formatting helpers (`src/data/format.test.js`). jsdom applies no CSS, so layout (widths, scrolling, which of the two "All parks" links is visible) is checked by hand.

**Build:** `npm run build` succeeds.

**Manual checks** (listed in each story spec's Verification section, run with `npm run dev`): landmarks and "Park not found"; Tab through the list with the amber focus ring visible, Enter to open, Back/"All parks" to return to the same card; tiles, attribution and 12 markers; desktop marker click opens details with an amber marker; at 375px a marker tap shows the preview; no location prompt; at 375×812 and 1280×800, compared against `design/screens/`, no horizontal scroll on list, details and the Map tab, and the amber ring on the toggle, cards, back links, zoom buttons, markers and preview.

**Code review:** each story went through a BMAD code review (independent blind, edge-case and verification-gap reviewers). Findings and their verdicts are logged in the story specs under `_bmad-output/implementation-artifacts/` ("Review Triage Log"). Gaps a reviewer proved by mutation (removing code and seeing every test still pass) were patched with tests; the park → park gap deferred from Story 1.3 is closed by this story.

## Time spent

About 2 hours. Prompting started around 9 pm; the agents ran while I stepped away, with about 15 minutes of hands-on work before the first commit just before 10 pm, and I was still working at 11:25 pm.

## Next steps before public use

- Check the layout on real phones and browsers (iOS Safari, Android Chrome), not just resized desktop windows.
- Move off the public OSM tile servers to a tile provider or self-hosted tiles that permit production traffic.
- Verify or correct the source data (Cedar Hill's coordinates, missing fields) with the parks department, and replace the placeholder image URLs with real photos and real alt text.
- Run a screen-reader pass (VoiceOver, NVDA) and an automated accessibility audit (axe) on the built app.
- Add an error boundary, so an unexpected render error shows a message instead of a blank page.
- Add browser end-to-end tests (Playwright) for the real layout, map interaction and focus behaviour, which jsdom cannot measure.
- Decide on hosting, caching and a data update process, since the JSON is a static file today.

## AI use & transcripts

This app was built with AI help, and the conversation logs are included unredacted:

- **Claude Code** (spec, stories, implementation, code reviews): `transcripts/`, exported by the developer before each fresh story context. Files start with a two-digit prefix giving the order they happened, then `storyN-dev`, `storyN-review`, or `storyN-dev-review` when one session did both; sessions not tied to a story use a short topic (`01-project-scaffolding`). Later transcripts follow the same convention.
  - `transcripts/01-project-scaffolding.txt`
  - `transcripts/02-story1-dev.txt`
  - `transcripts/03-story2-dev.txt`
  - `transcripts/04-story2-review.txt`
  - `transcripts/05-story3-dev.txt`
  - `transcripts/06-story3-review.txt`
  - `transcripts/07-story4-dev-review.txt`
  - `transcripts/08-story5-dev-review.txt`
  - `transcripts/09-story6-dev-review.txt`
- **Claude Design** (the UI designs): `transcripts/design-transcript.md`.
- **Transcript tooling side-quest** (writing the export script): `transcripts/tool-transcript.md`. The script itself is `tools/merge_session_transcripts.py`, which merges a Claude Code session's main and subagent transcripts into one timeline.

Planning and review artifacts produced along the way (spec, epics, story specs with review triage logs) are in `_bmad-output/`.

## Design files

The designs are in `design/`: screenshots of each screen at desktop (1280×800) and phone (390×844) sizes in `design/screens/`, the canvas source files in `design/source/` (reference only, not app code), and the design handoff notes in `design/README.md`. The pixel-art park images from the design session are bundled in `src/assets/park-images/`.
