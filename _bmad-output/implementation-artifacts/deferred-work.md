- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-park-details-with-missing-data-handling.md`
  summary: Add a park-to-park navigation test (open park A, fail its image, go straight to park B) that asserts B's image renders and B's heading takes focus.
  evidence: Removing `key={park.id}` from `PhotoArea` or changing the heading-focus effect deps to `[]` passes all tests. Unreachable until Story 1.4 adds map selection that switches parks without passing through `/`.
  status: resolved by Story 1.6 (`spec-1-6-tests-and-submission-readme.md`): `src/App.test.jsx` > Map on desktop > "moves from a park with a failed image straight to another park via its marker". Verified: removing `key={park.id}` from `PhotoArea` fails it, and so does changing the heading-focus effect deps to `[]`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-tests-and-submission-readme.md`
  summary: Stub `window.scrollTo` in `src/test/setup.js` so `npm test` stops printing jsdom "Not implemented: Window's scrollTo() method" notices.
  evidence: Every `npm test` run prints them (React Router scroll handling); the README lists them as noise, and they can hide real console errors in CI output. Pre-existing since 1.1.
