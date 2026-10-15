- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-park-details-with-missing-data-handling.md`
  summary: Add a park-to-park navigation test (open park A, fail its image, go straight to park B) that asserts B's image renders and B's heading takes focus.
  evidence: Removing `key={park.id}` from `PhotoArea` or changing the heading-focus effect deps to `[]` passes all tests. Unreachable until Story 1.4 adds map selection that switches parks without passing through `/`.
