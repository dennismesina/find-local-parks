---
id: SPEC-find-local-parks
companions:
  - stack.md
  - park-data.md
  - ../../../design/README.md
sources:
  - ../../../requirements/local-parks-candidate.pdf
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Find a Park

## Why

A mandate to meet: a 2-hour take-home brief (Granicus Lighthouse) to build a small web app that helps residents find local parks. Evaluation weighs usefulness and accessibility for residents, clear communication of decisions, maintainable code that handles missing data, accountable AI use, and evidence of review and verification. A modest app that works and is well explained beats an ambitious one with broken core features.

## Capabilities

- **CAP-1**
  - **intent:** A resident sees where parks are on a map and can get from a marker to that park's details.
  - **success:** Every park with valid lat/lng has a marker; activating a marker opens the park's details or a clear link to them.
- **CAP-2**
  - **intent:** A resident browses all parks in a list and selects one without using the map.
  - **success:** All parks in the data appear, including ones with missing fields; a list item opens details by mouse, touch, and keyboard (Tab to it, Enter to open).
- **CAP-3**
  - **intent:** A resident views the available information for a park: name, address, description, amenities, hours, images, acreage, rating.
  - **success:** Each of the 12 sample parks renders; null, missing, or empty fields are omitted or labelled as not listed, never invented; broken image URLs degrade without a broken-image icon or crash.
- **CAP-4**
  - **intent:** The main tasks (find a park, open its details) work on phone and desktop, by keyboard, and with assistive technology.
  - **success:** At 375px width and at desktop width the list→details flow works with no horizontal scroll; every interactive element shows a visible focus indicator; regions and controls have readable text and clear labels.
- **CAP-5**
  - **intent:** The interviewer can run, understand, and judge the submission from its README.
  - **success:** README contains run instructions, what works, what was left out, decisions, assumptions, data/schema changes, known issues, how the result was checked, approximate time spent, and next steps before public use.

## Constraints

- Hard 2-hour box for the whole submission, including testing and README; stop at 2 hours and document what is unfinished.
- Must work without the resident's location.
- No private credentials in the repo; services must be keyless or document how the interviewer supplies a key.
- Data fields may be missing or null and arrays empty; the UI must not crash or fabricate details.
- The list and details view must be a complete alternative to map markers.
- Use the supplied `parks.sample.json`; document any extension of data or schema in the README.
- Unredacted AI conversation logs from every tool used are part of the submission: the developer manually exports the Claude Code transcript before each fresh story context, and exports the Claude Design transcript; the generated designs are committed in `design/`.
- Visual design follows `design/README.md` and `design/screens/`; where they conflict with this SPEC, this SPEC wins.

## Non-goals

- Backend, accounts, hosted deployment.
- Search, filters, current-location support — only if the core is done with time remaining.
- Editing or contributing park data.

## Success signal

- On a phone-width viewport and on desktop, a resident can open any of the 12 sample parks from the list using only the keyboard, and from a map marker by click/tap, and see its details with missing fields handled cleanly; the interviewer runs it from the README with one install and one start command.

## Assumptions

- Municipality is the NYC-area set implied by the sample coordinates; the app is titled generically ("Find a Park").
- Parks without valid lat/lng still appear in the list and details, just without a marker.
- A data-load failure shows an error message, not a blank screen.
