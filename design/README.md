# Find a Park: design handoff

UI designs for the Find a Park take-home. They were drawn on a Claude design canvas before any code was written, and they are the visual spec for the React + Tailwind + Leaflet build. The full AI transcript of the design session is in the repo alongside this folder.

**These are reference designs, not code.** Build with React, Tailwind and react-leaflet (no component library), and use the screenshots plus the rules below. Where the brief and these designs disagree, the brief wins.

## Contents

| File | What it shows |
|---|---|
| `screens/01-desktop-list-map.png` | Desktop default: park list on the left, map on the right |
| `screens/02-desktop-park-selected.png` | Desktop with a park selected: details replace the list, the marker is highlighted |
| `screens/03-desktop-missing-data.png` | Desktop details for a park with missing data (Cedar Hill: no photos, no rating) |
| `screens/04-phone-list.png` | Phone, List tab |
| `screens/05-phone-map-selected.png` | Phone, Map tab, with a park selected (preview card) |
| `screens/06-phone-details.png` | Phone details, full data (Prospect Park) |
| `screens/07-phone-missing-data.png` | Phone details, missing data (Cedar Hill) |
| `source/*.dc.html` | Canvas source files, for reference only. They need the canvas runtime and are **not** meant to run in the app. |

Screenshots are at 2x: desktop at 1280×800, phone at 390×844. The map in every screenshot is a drawn stand-in. The real app uses Leaflet with OpenStreetMap tiles.

## Layout and behaviour

### Desktop (≥ 768px, Tailwind `md:`)

- A green header with the app name, a subtitle and the park count.
- Two columns:
  - **Left sidebar (~400px):** scrolls on its own.
  - **Map:** fills the rest of the screen.
- **Sidebar, list mode:** an "All parks" heading, a one-line hint, then one card per park.
- **Selecting a park** from either the list or the map:
  - The sidebar switches to details mode, starting with an "All parks" back button.
  - That park's marker turns amber and gets bigger.
  - The URL should change too (e.g. `?park=prospect-park` or `/parks/:id`), so details can be linked and the browser Back button works.
- **Going back to the list:** move focus to the card of the park you came from.
- **Opening details:** move focus to the details heading, so keyboard and screen-reader users land in the right place.

### Phone (< 768px)

- One column. A **List / Map** toggle sits under the header, made of two real `<button>`s with `aria-pressed`. List is the default.
- **Tapping a marker** opens a preview card at the bottom of the map. It shows the park's position in the list ("Park 8 of 12"), its name, address and hours, a **View park details** button and a close button.
- **Details** take the whole screen, with an "All parks" back link in the header.

### List ↔ map link

- Parks are sorted A–Z and numbered 1–12. The same number appears on the list card and on the map marker, so the two views always match.
- Every marker is focusable and named "8. Prospect Park" for screen readers. Use `L.divIcon` with a `<button>` inside it, or set `keyboard: true` and `alt`/`title` on the markers.
- The list is the main way to choose a park. The map is never the only way.

## Park card (list)

- Number badge, park name (17px bold), address, and the first three amenities as tags. If there are more, add a "+N more" tag.
- The whole card is a single `<button>` (or a link once there is routing), so it gets keyboard focus and one Tab stop.

## Details

The details view shows, from top to bottom:

1. Photo area (see the missing-data rules below)
2. Park name as the page heading (26–28px, 800 weight), then the address
3. An **Open in OpenStreetMap** link built from the park's lat/lng (`https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=16/{lat}/{lng}`). This was added during design and is easy to drop if you don't want it.
4. Three fact tiles: **Hours**, **Size** (acres), **Rating** ("4.7 / 5")
5. **About** (the description)
6. **Amenities**: all of them, as tags with a check mark. Turn the raw values into labels by replacing `-` with a space and capitalising the first letter (`dog-run` → "Dog run").

## Missing data: never invent a value

The brief requires this, and the sample data has every one of these cases.

| Field | When missing / null / empty | Show |
|---|---|---|
| `location.address` | Highland Dog Park | "Address not listed" in the secondary text colour |
| `description` | Old Mill Botanical Garden (`null`) | "No description has been provided for this park." |
| `rating` | Cedar Hill (`null`) | "Not yet rated" (do not show 0 or blank stars) |
| `images` | Cedar Hill, East Ridge (`[]`) | A dashed box: image icon + "No photos for this park yet" |
| `images` failing to load | **Every** sample URL (`images.example.com` doesn't exist) | The same fallback, triggered by `onError` on `<img>`; never a broken-image icon |
| `hours` | not in the sample, but handle it | "Not listed" |
| `acreage` | not in the sample, but handle it | "Not listed" |
| `amenities` | not in the sample, but handle it | Hide the Amenities section, or show "No amenities listed" |
| `location.lat/lng` | not in the sample, but handle it | Keep the park in the list, leave it off the map, and hide the map link |

Fact tiles with a missing value use the muted look from screen 07: `#F0EDE5` background, dashed `#C9C4B6` border, italic text. *Remark: the desktop screenshot (03) shows "Not yet rated" with the normal tile style. That is a mistake in the mock, and the phone version is the intended look.*

Wrap every field in a small helper (e.g. `display(value, fallback)`) so the rules stay in one place. Never let a missing nested field crash the app (`park.location?.address`).

## Design tokens (Tailwind)

Add these under `theme.extend` (or as CSS variables with Tailwind v4 `@theme`):

```js
colors: {
  paper:   '#F6F4EE', // page background
  surface: '#FFFFFF', // cards, tiles
  line:    '#DAD6CB', // card borders
  ink:     '#1B2620', // main text
  muted:   '#4F5B54', // secondary text (≈7:1 on white)
  forest:  { DEFAULT: '#1E5B3F', dark: '#123826' }, // header, primary buttons, markers, links
  tag:     { bg: '#E9EFE7', fg: '#23472F' },         // amenity tags
  amber:   '#B45309', // selected marker and focus ring
  missing: { bg: '#F0EDE5', line: '#C9C4B6' },       // missing-value tiles, no-photo box
  map:     { land: '#E4E8DF', water: '#B9D3DC' },    // only for the drawn map; real tiles replace these
},
fontFamily: { sans: ['"Public Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'] },
```

- **Font:** Public Sans from Google Fonts, weights 400/500/600/700/800.
- **Type sizes:**
  - Body 15–16px; card titles 17px bold
  - Details heading 26–28px (800 weight); section headings 17–18px
  - Small labels 13px; nothing smaller except the map attribution
- **Corner radius:** cards 10px, buttons 8–10px, tags fully rounded.
- **Spacing:** sidebar padding 20px (16px on phone), 10px between cards, 14–16px inside cards.

## Accessibility

These checks match what the brief evaluates:

- **Focus ring:** every interactive element gets a visible ring, `focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-amber focus-visible:outline-offset-2`. Never remove outlines without putting this ring in their place.
- **Touch targets:** at least 44×44px, including the zoom buttons, the close button and the back button.
- **Real elements:** use `<button>`, `<a href>`, `<ul>/<li>` for the list, `<dl>/<dt>/<dd>` for the fact tiles, and one `<h1>` per view. No clickable `<div>`s.
- **Landmarks:** `<header>`, `<main>`, an `<aside aria-label="Parks">` for the sidebar, and a map section labelled "Map of parks".
- **Labels:** icon-only buttons need an `aria-label` ("Zoom in", "Close park preview").
- **Contrast:** text has at least 4.5:1 contrast. The colours above meet that, including white on forest.
- **Location:** never ask for the user's location; the app must work without it. Centre the map on a fixed view, or fit it to the parks' bounds.

## Remarks and open decisions

- **Municipality:** the parks span Brooklyn, Manhattan, Queens and the Bronx and are mostly fictional (Prospect Park is real). The designs call the area "New York City area". Say so in the project README.
- **Cedar Hill coordinates** (40.7128, -74.006) are exactly the standard "New York City" point, so they are probably a placeholder. The park is shown as given; mention it in Known issues.
- **Short addresses** such as "Ridge Rd" and "Shore Pkwy" are shown as given, without adding a city.
- **Not designed:**
  - Search and filters (optional in the brief)
  - Current-location support (optional)
  - A loading state and an error state for when `parks.json` fails to load. Both are worth adding: a short "Loading parks…" message and a "Couldn't load parks. Try again." message with a retry button, using the same card style.
- **Hours** are shown exactly as written in the data ("Dawn to dusk", "24 hours"). An "Open now" badge was left out on purpose, because parsing these strings reliably is out of scope.
- **Photos:** there is no gallery. The mock shows the first photo with a "Photo 1 of N" label. Showing a single image, or a simple row of thumbnails, is fine.
- **Map tiles:** OpenStreetMap's tile server needs no API key; keep its attribution visible. For real public use, switch to a tile provider that allows production traffic. That belongs in the README's next steps.
