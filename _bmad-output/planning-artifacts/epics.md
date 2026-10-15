---
project: find-local-parks
spec: ../specs/spec-find-local-parks/SPEC.md
stories_source: ../specs/spec-find-local-parks/stories.yaml
---

# Find a Park: Epics and Stories

Derived from `SPEC-find-local-parks` and its companions. Every story must also be read with:

- `../specs/spec-find-local-parks/SPEC.md`: capabilities CAP-1 to CAP-5, constraints, non-goals
- `../specs/spec-find-local-parks/stack.md`: stack and conventions
- `../specs/spec-find-local-parks/park-data.md`: data shape, the image URL transformation, known gaps
- `../../design/README.md` and `../../design/screens/`: layout, tokens, missing-data wording, accessibility rules

Where the design and the SPEC disagree, the SPEC wins.

## Requirements Coverage

| Capability | Stories |
|---|---|
| CAP-1 Map | 1.4 |
| CAP-2 List | 1.2 |
| CAP-3 Details and missing data | 1.1 (data layer), 1.3 |
| CAP-4 Accessible, responsive UI | 1.2, 1.3, 1.4 (baseline), 1.5 (full pass) |
| CAP-5 README | 1.6 |

Cross-cutting constraints that apply to every story: no geolocation, no credentials, never invent missing data, `parks.sample.json` is never edited, keyboard focus is always visible.

## Epic 1: Find a Park

A resident can find a local park on a map or in a list and open its details on a phone or desktop, by mouse, touch, or keyboard, with missing data handled honestly. The interviewer can run and judge the result from the README.

### Story 1.1: Scaffold app and park data layer

As a developer,
I want a running Vite + React + Tailwind app with a safe park data layer, routing, and bundled images,
So that every later story builds on data that cannot crash the UI.

**Acceptance Criteria:**

**Given** a fresh clone
**When** the developer runs one install command and one start command
**Then** the app starts locally with no API keys or extra setup

**Given** `requirements/parks.sample.json`
**When** it is copied into the app
**Then** its contents are byte-for-byte unchanged

**Given** the park data is loaded
**When** it is normalized
**Then** every park has safe defaults for missing, null, or empty fields per `park-data.md`, with no fabricated values
**And** parks are sorted A–Z and numbered 1–N (the number used on list cards and map markers)
**And** reading a missing nested field such as `location.address` never throws

**Given** the pixel art in `design/park-images/`
**When** the app is scaffolded
**Then** the images are moved to `src/assets/park-images/`
**And** each image URL is mapped at load time by filename stem to its bundled asset (`.../prospect-1.jpg` → `park-images/prospect-1.png`)
**And** a URL with no matching asset passes through unchanged

**Given** the app is running
**When** the URL is `/` or `/parks/:id`
**Then** the layout shell renders `<header>`, `<main>`, an `<aside aria-label="Parks">` region, and a map region labelled "Map of parks"
**And** `/parks/:id` identifies the selected park, an unknown id shows a "park not found" message with a way back to the list, and browser Back works

**Given** the park data fails to load
**When** the app renders
**Then** it shows "Loading parks…" while loading and "Couldn't load parks. Try again." with a retry button on failure, never a blank screen

**Given** the design tokens and font in `design/README.md`
**When** Tailwind is configured
**Then** the colour tokens, the Public Sans font, and the amber focus-visible ring utility are available

### Story 1.2: Park list with keyboard selection

As a resident,
I want to browse every park in a list and open one without using the map,
So that I can find a park by mouse, touch, or keyboard alone.

**Acceptance Criteria:**

**Given** the park data
**When** the list renders
**Then** all 12 parks appear A–Z inside a `<ul>`, including parks with missing fields
**And** the list has an "All parks" heading and a one-line hint

**Given** a park card
**When** it renders
**Then** it shows its number badge, name, address (or "Address not listed" in the muted colour), and the first three amenities as readable tags plus "+N more" when there are more

**Given** a keyboard user
**When** they press Tab through the list
**Then** each card is a single tab stop (one `<button>` or link) with a visible amber focus ring
**And** pressing Enter navigates to `/parks/:id`

**Given** a mouse or touch user
**When** they click or tap a card
**Then** the app navigates to that park's details

**Given** the user returns from details to the list
**When** the list renders again
**Then** focus moves to the card of the park they came from

### Story 1.3: Park details with missing-data handling

As a resident,
I want to see everything known about a park, and a clear note where information is missing,
So that I can decide whether to visit without being misled.

**Acceptance Criteria:**

**Given** the user opens `/parks/:id`
**When** details render
**Then** an "All parks" back control appears first, then the photo area, the park name as the view's single `<h1>`, the address, an "Open in OpenStreetMap" link from lat/lng, fact tiles in a `<dl>` for Hours, Size (acres), and Rating ("4.7 / 5"), the About description, and all amenities as checked tags
**And** focus moves to the details heading when details open

**Given** a park with missing data
**When** details render
**Then** each case follows the `design/README.md` missing-data table:
- missing `location.address` (Highland Dog Park) → "Address not listed"
- `description: null` (Old Mill Botanical Garden) → "No description has been provided for this park."
- `rating: null` (Cedar Hill) → "Not yet rated", never 0 or empty stars
- `images: []` (Cedar Hill, East Ridge) → a dashed "No photos for this park yet" box
- missing `hours` or `acreage` → "Not listed"
- missing or empty `amenities` → the section is hidden or shows "No amenities listed"
- missing lat/lng → no OpenStreetMap link
**And** missing-value fact tiles use the muted style (missing background, dashed border, italic text)

**Given** an image fails to load
**When** the `<img>` fires `onError`
**Then** the no-photo box replaces it, with no broken-image icon

**Given** a park has images
**When** details render
**Then** the first image shows with a "Photo 1 of N" label and alt text naming the park

**Given** amenity tokens such as `dog-run`
**When** they render
**Then** they display as readable labels ("Dog run"), and unknown tokens are humanized the same way, never dropped

### Story 1.4: Map of parks synced with selection

As a resident,
I want to see where parks are on a map and open a park from its marker,
So that I can choose by location.

**Acceptance Criteria:**

**Given** the app loads without location permission
**When** the map renders
**Then** it shows OpenStreetMap tiles via react-leaflet with visible attribution, fitted to the bounds of parks that have coordinates
**And** it never requests the user's location

**Given** parks with valid lat/lng
**When** the map renders
**Then** each has a marker showing its list number, focusable, with the accessible name "N. Park name"
**And** a park with no valid coordinates has no marker but stays in the list
**And** markers render correctly under Vite (no broken default icon)

**Given** desktop width (≥ 768px)
**When** the user activates a marker by click or keyboard
**Then** the app navigates to `/parks/:id` and the sidebar shows that park's details

**Given** a park is selected from either the list or the map
**When** the map renders
**Then** that park's marker is amber and larger than the others

**Given** phone width (< 768px)
**When** the user taps a marker on the Map tab
**Then** a preview card shows "Park N of 12", the name, the address, the hours, a "View park details" button, and a close button labelled "Close park preview"

**Given** map controls
**When** they render
**Then** zoom and close buttons have `aria-label`s and touch targets of at least 44×44px

### Story 1.5: Responsive and accessibility polish with design applied

As a resident on a phone or using a keyboard or screen reader,
I want the app to match the designed layouts and work well in every mode,
So that the main tasks are easy everywhere.

**Acceptance Criteria:**

**Given** the screens in `design/screens/`
**When** the app is compared against them at 1280×800 and 390×844
**Then** the layout, tokens, type sizes, corner radius, and spacing match `design/README.md`, except where the SPEC overrides the design

**Given** desktop width (≥ 768px)
**When** the app renders
**Then** a green header shows the app name, subtitle, and park count, with a ~400px independently scrolling sidebar and the map filling the rest

**Given** phone width (< 768px)
**When** the app renders
**Then** a single column shows a List / Map toggle of two `<button>`s with `aria-pressed`, List by default
**And** details take the full screen with an "All parks" back link in the header

**Given** widths of 375px and 1280px
**When** the user completes list → details → back
**Then** there is no horizontal scroll and every interactive element shows the amber focus-visible ring

**Given** the whole app
**When** it is checked for accessibility
**Then** there are no clickable `<div>`s, there is one `<h1>` per view, every icon-only button has an `aria-label`, touch targets are at least 44×44px, and text contrast is at least 4.5:1

### Story 1.6: Tests and submission README

As the interviewer,
I want evidence the app was checked and a README I can run and judge from,
So that I can evaluate usefulness, decisions, and verification.

**Acceptance Criteria:**

**Given** Vitest + React Testing Library
**When** `npm test` runs
**Then** tests pass that cover every known gap in `park-data.md`: Old Mill's null description, Cedar Hill's empty images and null rating, East Ridge's empty images, Highland's missing address, an image that fails to load, and an unmatched image URL
**And** a test covers the keyboard flow: Tab to a list card, Enter, the details heading receives focus, and "All parks" returns focus to the originating card
**And** a test covers the image URL transformation without mutating the source data

**Given** the README
**When** the interviewer reads it
**Then** it contains run instructions, what works, what was left out, decisions (stack, routing, map tiles), assumptions from SPEC.md, data changes (the image URL transformation; the JSON file is unchanged), known issues (including Cedar Hill's placeholder-looking coordinates and the OSM tile usage policy), how the result was checked, approximate time spent, and next steps before public use
**And** it says where the unredacted Claude Code and Claude Design transcripts and the design files live in the repo
