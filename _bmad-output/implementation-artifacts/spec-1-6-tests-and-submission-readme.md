---
title: 'Story 1.6: Tests and submission README'
type: 'feature'
created: '2026-10-14'
baseline_commit: 'ea328a0651f3c7c34484d65f6ed775576d9786e9'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `README.md` is empty, so the interviewer cannot run or judge the submission (CAP-5). The suite passes but `npm test` reports an unhandled `Invalid LatLng object: (NaN, NaN)` error, the keyboard list → details → back flow is only covered in two halves, and the park-to-park test deferred from 1.3 is still missing.

**Approach:** Close the test gaps against the Story 1.6 ACs with test-only changes, so `npm test` is clean, and write the submission README with every section the AC lists. Story 1.5 is being built in parallel on its own branch; this story does not touch app code, and the user rebases onto 1.5 later.

## Boundaries & Constraints

**Always:** test-only changes under `src/`; every README claim is true of the code at this commit or labelled as pending Story 1.5; README run instructions are exactly `npm install` then `npm run dev` (plus `npm test`, `npm run build`); name `parks.sample.json` as unchanged; state "no API keys, no geolocation".

**Never:** edit `src/**/*.jsx`/`src/data/*.js` app code, `index.css`, or `parks.sample.json`; layout/responsive/a11y polish (1.5); new dependencies; invent features in "What works"; edit or redact transcript contents.

**Decisions (human):**
- Time spent: "about 2 hours" — started prompting ~9 pm, agents ran while the developer stepped away, ~15 min of hands-on work before the first commit just before 10 pm, still working at 11:25 pm.
- Story 1.5: the README describes this branch truthfully; 1.5 items (desktop sidebar, phone List/Map toggle, responsive/a11y polish, design applied) are marked "in progress (Story 1.5)" for the developer to update at rebase.
- Transcripts move with `git mv` into `transcripts/`, keeping extensions: `transcript1.txt` → `01-project-scaffolding.txt`, `2` → `02-story1-dev`, `3` → `03-story2-dev`, `4` → `04-story2-review`, `5` → `05-story3-dev`, `6` → `06-story3-review`, `7` → `07-story4-dev-review`; `claude-design-transcript.md` → `design-transcript.md`; `claude-session-extraction-sidequest-transcript.md` → `tool-transcript.md`. `merge_session_transcripts.py` → `tools/`. The README states the `NN-storyN-<dev|review>` convention and that transcripts 08+ follow it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean run | `npm test` | all tests pass, 0 unhandled errors | N/A |
| Keyboard flow | `/`, Tab until Old Mill's card has focus, Enter | details `<h1>` focused; Shift+Tab, Enter on "All parks" → focus on Old Mill's card | N/A |
| Park → park | desktop, open Prospect Park, fire `error` on its image, click marker for another park with images | new park's `<img>` renders and its `<h1>` has focus | N/A |
| Repeat marker click | the existing duplicate-history test | passes with no Leaflet NaN error | test-only |

</frozen-after-approval>

## Code Map

- `src/App.test.jsx` -- `renderAt`, `renderWithLocation`, `stubData`, `stubViewport`, `markerNamed`/`findMarkerByName`, `cardFor`, `findCards`. Line ~533 "All parks" test opens by click; ~261 Enter test does not check heading focus or return; ~713 duplicate-history test is the NaN source.
- NaN root cause: two clicks on a marker within 200 ms make Leaflet (`leaflet-src.js` `simDblclick`) synthesize a `dblclick` on the map; `mouseEventToContainerPoint` divides by jsdom's zero `getBoundingClientRect` width → NaN. A jsdom artefact, not an app bug.
- `src/data/parks.test.js:65` -- frozen-source no-mutation test of the image transform already exists; keep it.
- `_bmad-output/specs/spec-find-local-parks/SPEC.md` (Assumptions), `park-data.md` (gaps, image transform), `stack.md`, `epic-1-context.md` (decisions) -- README sources. Spec Implementation Notes of 1.1–1.4 hold dev decisions (fetch from `public/data/`, React Router, vitest 4/jsdom 29 on Node 25, divIcon markers, `tile.openstreetmap.org`).
- `deferred-work.md` -- the 1.3 park→park entry; mark it resolved.

## Tasks & Acceptance

**Execution:**
- [x] `src/App.test.jsx` -- add the full-keyboard test (Tab from document start, not `focus()`), the park→park test, and space the duplicate-history test's second click past Leaflet's 200 ms window (e.g. `vi.spyOn(Date, 'now')`) -- clean `npm test`.
- [x] `README.md` -- sections: Run, What works, Left out, Decisions (stack, data load via `fetch`, React Router `/parks/:id`, OSM tiles + divIcon markers), Assumptions (from SPEC.md), Data changes (image URL transform; JSON unchanged), Known issues (Cedar Hill placeholder-looking coordinates; OSM tile usage policy — fine for review, not for public traffic), How it was checked (test map of each park-data gap → test name, `npm run build`, manual checks, BMAD code reviews), Time spent, Next steps before public use, AI use & transcripts, Design files (`design/`).
- [x] `transcripts/`, `tools/` -- `git mv` the files per the Decisions; update the usage paths in the moved script's docstring only if they name its location.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- mark the 1.3 entry resolved by this story.

**Acceptance Criteria:**
- Given `npm test`, then output has no "Unhandled Errors" section and every AC test from epics.md Story 1.6 maps to a named test listed in the README.
- Given the README, then each item in the Story 1.6 README AC appears under its own heading, and every file path it names exists.

## Implementation Notes

- Post-rebase onto Story 1.5 (`a4a648b`): the keyboard-only test now scopes its "All parks" lookup to the sidebar, because 1.5 added a second link in the phone header (the same pattern as 1.5's own tests). The README now describes 1.5 as delivered (desktop/phone layouts, toggle, Back to the originating tab, accessibility, `document.title`). It drops the "in progress" markers and the stale `document.title` next step, and lists `transcripts/08-story5-dev-review.txt`, moved from the repo root. 131 tests pass; the build succeeds.

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG) of `ea328a0..working tree` (excluding this spec and `sprint-status.yaml`). VG: no gaps; it verified that removing `key={park.id}` from `PhotoArea` or setting the heading-focus deps to `[]` fails the park→park test, and that removing either focus call fails the keyboard test.

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| BH9 | No minimum Node version in Run | medium | `react-router` engines `>=22.22.0`, `vite` `^20.19 \|\| >=22.12`; an interviewer on Node 20 LTS fails `npm install`/run with no hint | patch |
| BH3 | Park→park test does not assert the selection moved | low | Only heading focus and image are checked; two assertions on `bg-amber` close it | patch |
| BH5 | "106 tests" hard-coded in README | low | Story 1.5 adds tests on rebase, so the figure goes stale; fix is a deletion | patch |
| BH7 | Stated transcript convention contradicted by `01-project-scaffolding`, `07-story4-dev-review` | low | Both names are listed right under the `NN-storyN-<dev\|review>` rule; fix is rewording | patch |
| BH1 | Deferred-work resolution records only the `key` mutation | low | VG verified the deps-`[]` mutation also fails; fix is a one-line correction | patch |
| BH11 | jsdom `scrollTo` notices documented instead of stubbed | low | Pre-existing since 1.1; not caused by this change | defer |
| BH2 | Double-clicking a marker may zoom the map in a real browser | maybe-false | In jsdom the synthesized dblclick targets the map; in browsers Leaflet markers default to `bubblingMouseEvents: false`. Settled by a manual double-click in `npm run dev`. Pre-existing 1.4 behaviour; at worst low | reject (low if true) |
| EC1 | `Date.now` mock leaves Leaflet's `last` in the future, so a later map click re-synthesizes dblclick | false | The only later click in that test is the "back" button outside the map; the map unmounts in `cleanup()` | reject |
| BH4 | Keyboard test's 20-step Tab cap; one-Tab-stop unproven | false | `expect(target).toHaveFocus()` fails loudly past the cap; one Tab stop per card is covered by "gives each card exactly one Tab stop" | reject |
| BH6 | README describes branch state instead of the submission | false | Human Decision: describe this branch and mark 1.5 items in progress | reject |
| BH8 | "About 2 hours" vs 9 pm–11:25 pm | false | Human Decision, including the stepped-away time | reject |
| BH10 | Coverage table overstates coverage | false | It claims a test for each Story 1.6 AC only, which holds | reject |
| BH12 | Assumptions section incomplete | false | The AC asks for assumptions from SPEC.md; all three are listed; breakpoint and first-photo are under Decisions/Left out | reject |

## Design Notes

Cedar Hill: coordinates look like a placeholder — describe as "plotted as given; not corrected". Do not alter the data.

## Verification

**Commands:**
- `npm test` -- expected: all pass, no unhandled errors.
- `npm run build` -- expected: succeeds.
