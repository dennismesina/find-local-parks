---
title: 'Story 1.2: Park list with keyboard selection'
type: 'feature'
created: '2026-10-14'
baseline_commit: 'db7ac92a5a8ff8c8e42531fa18fb2991a49bfe68'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The `/` route shows only an "All parks" heading. A resident cannot browse parks or open one without a map, and the list is the main way to choose a park (CAP-2).

**Approach:** Replace the list placeholder with an "All parks" heading, a one-line hint, and a `<ul>` of 12 park cards, sorted A–Z by the existing loader. Each card is a single React Router `<Link>` to `/parks/:id`. When the user comes back to `/` from a park, focus returns to that park's card.

## Boundaries & Constraints

**Always:** use the normalized parks from `useParks` as they are (order and `number` come from the loader, never recomputed); never invent data; one Tab stop per card; amber `focus-ring` on every card; touch target ≥ 44px; Tailwind tokens from `src/index.css`.

**Never:** details content, the "All parks" back control or focus-to-heading on details (Story 1.3); map or markers (1.4); desktop sidebar/phone toggle layout (1.5); clickable `<div>`s; a nested interactive element inside a card.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | 12 sample parks | 12 `<li>` cards in loader order, badges 1–12 | N/A |
| Missing address | Highland Dog Park `address: null` | "Address not listed" in `text-muted` | N/A |
| > 3 amenities | Prospect Park (7) | first 3 tags + "+4 more" | N/A |
| ≤ 3 amenities | East Ridge (3) | 3 tags, no "+N more" | N/A |
| No amenities | `amenities: []` | no tag row | N/A |
| Amenity label | `dog-run`, `wifi` | "Dog run", "Wifi" | unknown tokens humanized, never dropped |
| Return from details | `/parks/highland-dog-park` → Back | Highland card has focus | N/A |
| First visit | open `/` directly | no card is auto-focused | N/A |

</frozen-after-approval>

## Code Map

- `src/App.jsx` -- `ParkListPlaceholder` (renders only the h1) is what this story replaces; `ParksPanel` owns the `<Routes>` and receives `parks`; `ParkDetailsPlaceholder` renders on `/parks/:id`. Keep the loading/error states, `NotFound`, `cardClass`, and the landmarks.
- `src/data/parks.js` -- normalized park: `{ id, name, number, address, amenities, ... }`; `amenities` is always an array of strings. Don't change normalization.
- `src/index.css` -- tokens (`tag-bg`, `tag-fg`, `muted`, `forest`, `line`, `surface`) and the `focus-ring` utility.
- `src/App.test.jsx` -- `renderAt(path)` + `okResponse()` + the `TestNav` pattern for history Back; extend it here.
- `design/screens/01-desktop-list-map.png`, `04-phone-list.png` -- card visual: forest round number badge, 17px bold name, muted address, rounded tags. Hint copy: "Choose a park to see hours, amenities and directions."

## Tasks & Acceptance

**Execution:**
- [x] `src/data/format.js` -- `amenityLabel(token)`: replace `-` with spaces, capitalize the first letter, keep the rest; shared with 1.3's details.
- [x] `src/components/ParkList.jsx` -- `ParkList({ parks, focusParkId })`: h1 "All parks", hint `<p>`, `<ul>` of `<li><Link to={`/parks/${id}`}>` cards (badge, name, address or muted fallback, up to 3 tags + "+N more"). On mount, if `focusParkId` matches a card, focus that link.
- [x] `src/App.jsx` -- keep the last-opened park id in App-level state (set from the details route), pass it to `ParkList`, and clear it after the list has used it. Delete `ParkListPlaceholder`.
- [x] `src/data/format.test.js`, `src/App.test.jsx` -- unit-test `amenityLabel`; test every matrix row, Tab reaching each card link, Enter and click navigating to details, and focus returning via history Back.

**Acceptance Criteria:**
- Given the list, when a keyboard user presses Tab, then each card receives focus once, as a link, with the `focus-ring` class.
- Given a focused card, when the user presses Enter, then the URL becomes `/parks/:id` and that park's heading renders.
- Given a card, when the user clicks or taps it, then the app navigates to that park's details.
- Given the list renders, then all 12 parks appear inside a single `<ul>` under the "All parks" h1 and its hint.

### Review Findings

Code review 2026-10-14 (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) of `db7ac92..8c274b7`.

- [ ] [Review][Patch] Full card accessible name (separator spaces) is not asserted; deleting any `{' '}` after the address or inside the tag `Fragment` still passes all 50 tests (medium, verification-gap) [src/App.test.jsx:171]
- [ ] [Review][Patch] `amenityLabel` trims before replacing dashes, so `'-foo'` → " foo" (leading space, no capital) and `'dog--run'` → "Dog  run"; replace `/-+/g` then trim (low, edge-case-hunter) [src/data/format.js:3]
- [ ] [Review][Patch] Address ternary duplicates the same `<span className="block text-muted">`; collapse to `{park.address ?? 'Address not listed'}` so styling cannot drift (low, blind-hunter) [src/components/ParkList.jsx:29]

**Rejected:**
- Null `name` renders empty card title (BH/EC) — low, unlikely: `name` required by `park-data.md`, all 12 have one; same call as pass-1 BH1/EC2.
- Null/duplicate `id` → duplicate keys, `/parks/null` (EC) — low, unlikely: `id` required, sample ids unique; same as pass-1 BH2/EC1.
- Park id with `/ ? # %` needs `encodeURIComponent` (EC) — low, unlikely: all sample ids are kebab-case slugs.
- Duplicate amenity tokens shown twice, "+N more" inflated (EC) — low, unlikely: no sample park repeats a token; dedupe adds logic.
- Focus restored on any return to `/`, not only Back (BH/EC) — low, unlikely: no in-app link from details to `/` yet; same as pass-1 BH5/EC6.
- `useEffect(..., [])` fails exhaustive-deps; StrictMode double run (BH) — false: no ESLint in project; second run focuses the same card and re-clears null.
- `ParkList` doc comment misleading about order (BH) — false: comment says "loader order with loader numbers", which is exactly what it does.
- No empty state for zero parks (BH) — low, unlikely: same as pass-1 BH7/EC5.
- Long accessible name per card (BH) — rejected by design: Design Notes accept it; changing it edits the spec.
- Unmatched `focusParkId` / focus-visible ring after programmatic focus (BH/EC) — maybe-false, low at most: would need a real-browser check of `:focus-visible` after Back; rejected as low.
- `amenityLabel('')` returns empty pill (BH) — low, unlikely: `stringList` filters blanks before any caller.
- Missing test assertions: badge aria-hidden, invalid id leaves `lastParkId` null, click test not checking list gone (BH) — false/low: removing `aria-hidden` already breaks the `^N\. ` assertion (VG); the other two are negligible.
- Enter/click tests never assert the URL (AA) — false: `ParkDetailsPlaceholder` renders the park h1 only on `/parks/:id`, so the heading proves the route.
- `focus-ring` asserted on one card only (AA) — false: every card comes from the same `ParkCard` className; one card proves all.
- No 13th Tab to rule out an extra stop (AA) — false: card markup has no other focusables (chevron is `aria-hidden` svg).
- Order checked against hard-coded A–Z list (AA) — false: sample JSON is unsorted, so the test observes the loader's sort (VG).
- `onFocusUsed` fires even when no card matched (AA) — false as defect: matches the Design Notes "read once, then clear" intent.
- Commit claims "tests for every list edge case" (EC) — low: the untested edges are the rejected unlikely ones above; no code change.

## Implementation Notes

- `ParkList` also takes `onFocusUsed`, which the parent uses to clear the remembered id after the list consumes it.
- The number badge is `aria-hidden`, with an `sr-only` "N." in its place. Literal spaces sit between the card's text parts, so the accessible name reads "1. Cedar Hill Nature Preserve Cedar Hill Rd Trails …" and not run-together words.
- Decorative chevron per card (`aria-hidden`), from the phone design.
- The details route records the id only for a park that exists.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| VG1 | "No tag row" test checks only `.bg-tag-bg` pills, not the row wrapper | medium | Pre-verified: removing the `tags.length > 0` guard renders an empty wrapper and the test still passes | patch |
| BH3/EC3/VG-o | Tag `Fragment` keyed by label; duplicate or same-label tokens give duplicate keys | low | `stringList` does not dedupe; the fix is a direct key correction (index + label) | patch |
| BH4/EC4 | `amenityLabel` does not trim; `stringList` keeps untrimmed items (`parks.js:44`) | low | `' dog-run'` renders as " dog run" without a capital letter; adding `.trim()` is a direct correction | patch |
| BH11 | Test title says "loader order" but asserts a hard-coded A–Z list | low | Misleading if the sort changes; renaming the title is a direct correction | patch |
| BH1/EC2 | Null `name` renders an empty card title | low | `text(park.name)` can be null, but `park-data.md` makes `name` required and all 12 have one; same call as 1.1 EC2/BH8 | reject (unlikely) |
| BH2/EC1 | Null or duplicate `id` gives duplicate keys and a `/parks/null` link | low | `id` is required per `park-data.md`; sample ids are unique; same call as 1.1 EC3/BH7 | reject (unlikely) |
| BH5/EC6 | Focus returns to the last park on any route to `/`, not only Back | low | Intended for deep link → list and the 1.3 "All parks" control; only an odd path (park → `/parks/nope` → "Back to all parks") lands on a stale card. A guard adds branches | reject (unlikely) |
| BH6 | Mount-only effect skips deps; lint warning; StrictMode runs it twice | false | No ESLint in the project; the second StrictMode run focuses the same card, with no visible effect | reject |
| BH7/EC5 | No empty state when `ready` with zero parks | low | A non-array payload already goes to the error state; zero parks only if all 12 entries are invalid. Adds a branch | reject (unlikely) |
| BH8 | Focus silently lost when the remembered card is gone | low | Needs a retry that returns different data; adds a fallback branch | reject (unlikely) |
| BH9 | Card link's accessible name concatenates every text part | low | Accepted in Design Notes as the single-element card from the design; Story 1.5 runs the a11y pass | reject (by design) |
| BH10 | 44px test only checks the `min-h-11` class | low | jsdom has no layout; the manual check and Story 1.5 cover the real size | reject |
| BH12 | Review diff excludes the spec and sprint-status | false | Deliberate: the spec is the claims file for the edge-case layer, and sprint-status is workflow state, not code | reject |
| BH13 | Enter → Back focus round trip is untested | low | The focus mechanism runs on details mount, whatever opened it; Enter-open and click-Back are each tested | reject (unlikely) |

## Design Notes

Focus return has to work with browser Back, which carries no router state, so the id of the park the user came from lives in App state rather than in `location.state`. The details route records the id on mount. The list reads it once on mount, focuses that card, then clears it, so a later fresh visit to `/` does not steal focus. Story 1.3's "All parks" control will rely on the same mechanism (epic readiness decision).

The card's accessible name is all of its text (number, name, address, tags). That is acceptable for one link per card and matches the design's single-element card.

## Verification

**Commands:**
- `npm test` -- expected: all tests pass.
- `npm run build` -- expected: succeeds with no errors.

**Manual checks (if no CLI):**
- `npm run dev`, Tab through the list: amber ring on each card; Enter opens details; browser Back puts focus back on that card.
