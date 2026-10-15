---
title: 'Story 1.3: Park details with missing-data handling'
type: 'feature'
created: '2026-10-14'
baseline_commit: '643096771a75679e78ad0f58484d3afd9c26144c'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/parks/:id` shows only the park name (`ParkDetailsPlaceholder`). Residents can't see hours, size, rating, description, photos or amenities, or tell when a value is missing rather than wrong (CAP-3).

**Approach:** Replace the placeholder with a `ParkDetails` view in this order: an "All parks" back link, the photo area, the name as `<h1>`, the address, an "Open in OpenStreetMap" link, a `<dl>` of Hours/Size/Rating tiles, About, and Amenities. Every missing value gets the labelled fallback from `design/README.md`. Focus moves to the `<h1>` when details open.

## Boundaries & Constraints

**Always:** render the normalized park exactly as given and never invent a value; fallback copy matches the design table word for word; missing-value tiles use `bg-missing-bg`, a dashed `border-missing-line` and italic text; `focus-ring` and ≥ 44px targets on the back link and the OSM link; reuse `amenityLabel` from `src/data/format.js`; keep the `NotFound` branch and the `onOpen` id recording.

**Never:** a photo gallery or carousel (first photo only); map, markers or marker highlight (1.4); the desktop sidebar/phone header layout split or the List/Map toggle (1.5); an "Open now" badge or hours parsing; star icons; clickable `<div>`s; editing `parks.sample.json` or the normalizer.

**Decisions (agent-made, user-invisible or design-permitted):** empty amenities shows the Amenities heading with "No amenities listed" rather than hiding it. Rating shows one decimal (`4` → "4.0 / 5"). Size shows "N acres" ("1 acre" when N is 1). Photo alt is "Photo of {name}". The back control is a `<Link to="/">`, so the existing `lastParkId` mechanism returns focus to the card.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full data | Prospect Park | all sections; "Photo 1 of 2"; tiles "6:00 AM - 1:00 AM", "526 acres", "4.7 / 5"; 7 checked amenity tags | N/A |
| Missing address | Highland Dog Park | "Address not listed" in `text-muted` | N/A |
| Null description | Old Mill Botanical Garden | About reads "No description has been provided for this park." | N/A |
| Null rating | Cedar Hill | Rating tile "Not yet rated", muted style; no "0" | N/A |
| No images | Cedar Hill, East Ridge | dashed "No photos for this park yet" box, no `<img>` | N/A |
| Image fails | `<img>` fires `error` | the no-photo box replaces it | no broken-image icon |
| Missing hours / acreage | synthetic park | the tile reads "Not listed", muted style | N/A |
| Empty amenities | synthetic `amenities: []` | "No amenities listed" | N/A |
| No coordinates | synthetic `hasCoords: false` | no OSM link | N/A |
| Unknown amenity | `wifi`, `dog-run` | "Wifi", "Dog run" | humanized, never dropped |
| Back control | click "All parks" | `/` renders; that park's card has focus | N/A |

</frozen-after-approval>

## Code Map

- `src/App.jsx` -- `ParkDetailsPlaceholder` (find park by `:id`, call `onOpen`, `NotFound` fallback) is the code to replace. Move that lookup into the new component, or wrap it. `linkClass`/`cardClass` are reusable styles. `lastParkId` + `ParkList focusParkId` already restore card focus on any return to `/`.
- `src/data/parks.js` -- normalized park `{ id, name, number, description, address, lat, lng, hasCoords, amenities, hours, images, acreage, rating }`. Missing values are `null`/`[]`, `rating` is in 0–5 or `null`, and `images` already resolve to bundled assets. Don't change it.
- `src/data/format.js` -- `amenityLabel`; add the small display helpers here (the epic asks for a central `display(value, fallback)`-style rule set).
- `src/index.css` -- tokens `missing-bg`, `missing-line`, `tag-bg`, `tag-fg`, `muted`, `forest`, `line`, `surface`; the `focus-ring` utility.
- `src/App.test.jsx` -- the `renderAt(path)`, `okResponse()` (structuredClone of the sample, so tests can mutate it for synthetic parks) and `TestNav` patterns.
- `design/screens/02-desktop-park-selected.png`, `06-phone-details.png`, `07-phone-missing-data.png` -- the visuals: bordered "‹ All parks" button, a rounded photo with a dark "Photo 1 of N" pill at bottom-right, a 3-column tile grid, ✓ tags.
- OSM URL: `https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=16/{lat}/{lng}`.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/format.js` -- add `formatRating(n)` → "4.7 / 5" or `null`, `formatAcres(n)` → "526 acres" / "1 acre" or `null`, `osmUrl(lat, lng)`, and `display(value, fallback)` → `{ text, missing }` so the view applies every fallback through one rule.
- [x] `src/components/ParkDetails.jsx` -- `ParkDetails({ park })` renders the sections in order: `PhotoArea` (keyed by park id, `onError` → no-photo box), an `<h1 tabIndex={-1}>` focused on mount, a `<dl>` of `FactTile`s (muted variant when the value is missing), About, and Amenities as a `<ul>` of ✓ tags.
- [x] `src/App.jsx` -- the `/parks/:id` route renders `ParkDetails` for a found park (keep `onOpen` and `NotFound`); delete `ParkDetailsPlaceholder`.
- [x] `src/data/format.test.js`, `src/App.test.jsx` -- unit-test the new helpers; test every matrix row (synthetic rows by editing the cloned sample in a custom fetch mock), section order, and focus on the heading after opening from the list.

**Acceptance Criteria:**
- Given the list, when the user opens a park by keyboard, then the details `<h1>` has focus and is the only `<h1>` in the view.
- Given details, when the user activates "All parks", then the list renders and focus is on that park's card.
- Given a park with images, then one `<img>` shows with alt naming the park and a "Photo 1 of N" label.
- Given any of the 12 sample parks, when details render, then nothing crashes and no value reads "null", "undefined" or "NaN".

### Review Findings

Code review 2026-10-14 (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) of commit `c08a597`.

- [x] [Review][Patch] The OSM link's "(opens in new tab)" hint and its `target`/`rel` are untested: the name regex `/^Open in OpenStreetMap/` is a prefix match, so the BH6 fix can be deleted without any test failing [src/App.test.jsx:375]

**Rejected**

- `false` — Spec `status: 'done'` vs sprint-status `review` (BH, AA): the fix would edit the spec under review, and this review's status sync settles it.
- `false` — Sprint status leaves 1-2 `in-progress` (BH): this was set deliberately by `6430967` after 1-2's review left patches open. This change did not cause it.
- `false` — Implementation Notes / Spec Change Log are empty (BH): the fix would edit the spec under review. The applied patches show in the diff and the triage log.
- `false` — `osmUrl` could emit `NaN` in the href (BH, EC, AA): the normalizer sets `hasCoords` only when `lat`/`lng` pass `numberInRange`, so the link never renders with non-finite coordinates.
- `low` — Null `name` gives an empty `<h1>` and alt "Photo of null", which the no-null test misses (EC, BH, AA): all 12 sample parks have names, `name` is required by the data contract, and the fix adds a fallback branch. This is the same call as 1.1 EC2, 1.2 BH1 and 1.3 pass-1 EC1/EC4.
- `low` — `0` acres / `0.0 / 5` rendered as real values (BH): the normalizer treats 0 as valid, no sample park has 0, and the design's "do not show 0" applies only to `null`.
- `false` — No range check on rating (BH): `normalizePark` already nulls ratings outside 0–5.
- `false` — Every address is muted, so the missing-address test is weak (BH): the design table asks only for "secondary text colour", and the design shows every address muted. This is the same call as pass-1 BH2.
- `false` — Deep link to `/parks/:id` moves focus to the `<h1>` (BH): focusing the page heading on route load is the intended SPA pattern, so nothing bad happens.
- `false` — The deferred-work entry lacks an id/status (BH): the ledger is new, and the loop sweep's `--migrate` handles pre-DW-format entries.
- `false` — "Photo 1 of N" implies a gallery (BH): `design/README.md` asks for exactly this label on a single image.
- `low` — A dash-only amenity token (`"-"`) renders an empty tag (EC): no sample data does this, and the fix adds a filter.
- `false` — Same park id re-rendered with new images keeps a stale failed state (EC): parks load once, and no path changes a park's images in place.
- `low` — `formatAcres` has no rounding or thousands separator (EC): sample acreages are integers ≤ 640. This is the same call as pass-1 EC3/BH4.
- `low` — `toFixed(1)` rounds a two-decimal rating (AA): no sample rating has two decimals, and one decimal is a spec Decision.
- `false` — Park-to-park refocus and `PhotoArea` reset are untested (AA, VG other): this is already deferred in `deferred-work.md` (VG2), so it is not a new finding.

## Implementation Notes

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| VG1 | Muted style of the About fallback and of "No amenities listed" is never asserted | medium | Pre-verified: dropping `italic text-muted` from either still passes all 74 tests | patch |
| BH6 | OSM link opens a new tab without warning screen-reader users | low | `target="_blank"` with no hint; every user who activates it meets this. The fix is one `sr-only` span | patch |
| BH10 | `data-testid="no-photo"` is unused | low | No test queries it; the fix is a direct deletion | patch |
| VG-o | `display` doc comment omits non-finite numbers | low | The code treats `NaN`/`Infinity` as missing; the fix is a direct comment correction | patch |
| VG2 | Refocus on park change and `PhotoArea` key reset are untested | low | Pre-verified gap, but no park→park navigation exists until 1.4 (details link only to `/`) | defer |
| EC1/BH1 | Null `name` gives an empty `<h1>` and alt "Photo of null" | low | `name` is required per `park-data.md` and all 12 have one; same call as 1.1 EC2 and 1.2 BH1. The fix adds a fallback branch | reject (unlikely) |
| EC4 | The no-null test reads `textContent`, not `alt` | low | Only reachable via a null name (EC1); all sample parks have names | reject (unlikely) |
| EC3/BH4 | `formatAcres` has no thousands separator or rounding | low | Sample acreages are integers ≤ 640; no long floats or values ≥ 1000 | reject (unlikely) |
| BH2 | A missing address looks like a real one; the `text-muted` test is weak | false | The design table asks only for "Address not listed in the secondary text colour", and the design shows every address muted | reject |
| BH3 | Only the first photo is tried before "No photos" shows | low | Spec: first photo only. All sample URLs map to bundled assets that load; a fallthrough adds state | reject (unlikely) |
| BH5 | `display()` stringifies objects/arrays | false | Every caller passes normalized strings, numbers or `null` (`parks.js` `text`/`finiteNumber`) | reject |
| BH7 | `document.title` is not set per park | low | Pre-existing; same call as 1.1 BH14, and fits the 1.5 a11y pass | reject (unlikely) |
| BH8 | `grid-cols-3` is cramped at phone width | false | `07-phone-missing-data.png` shows three tiles in one row at 390px; `min-w-0 break-words` prevents overflow | reject |
| BH9 | Amenities name announced twice | false | A labelled list inside a section with a heading is standard ARIA; the two are separate elements, announced in different contexts | reject |
| BH11 | Duplicate amenity tokens are not deduped | low | No sample park repeats a token; same call as 1.2 EC | reject (unlikely) |
| BH12 | Review diff excludes the spec and sprint-status | false | Deliberate, as in 1.2 BH12: the spec goes to the edge-case layer as the claims file | reject |

## Design Notes

Focus-to-heading uses a ref plus `useEffect` keyed on `park.id`, so moving from one park to another also refocuses. The heading needs `tabIndex={-1}` to be focusable from code, and it gets no `focus-ring`, since a programmatic focus target is not a Tab stop. `PhotoArea` keeps a `failed` state and is keyed by park id, so a failure on one park does not hide another park's photo.

Missing-value tile golden example:

```jsx
<div className={missing ? 'border-dashed border-missing-line bg-missing-bg' : 'border-line bg-surface'}>
  <dt className="text-sm text-muted">Rating</dt>
  <dd className={missing ? 'italic text-muted' : 'font-semibold'}>{value ?? fallback}</dd>
</div>
```

## Verification

**Commands:**
- `npm test` -- expected: all tests pass.
- `npm run build` -- expected: succeeds with no errors.

**Manual checks (if no CLI):**
- `npm run dev`. Open Cedar Hill: dashed photo box and a muted "Not yet rated" tile. Open Prospect Park: the photo shows "Photo 1 of 2". Tab to "All parks", press Enter, and focus lands on the card.
