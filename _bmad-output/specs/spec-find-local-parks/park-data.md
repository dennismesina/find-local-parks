# Park data

Source: `requirements/parks.sample.json` — an array of 12 park objects.

## Shape

| Field | Type | May be missing/null/empty |
|---|---|---|
| `id` | string (slug) | treat as required |
| `name` | string | treat as required |
| `description` | string | yes |
| `location.lat`, `location.lng` | number | yes (no marker if absent) |
| `location.address` | string | yes |
| `amenities` | string[] (kebab-case tokens, e.g. `dog-run`) | yes / empty |
| `hours` | free-text string (e.g. `Dawn to dusk`, `24 hours`) | yes |
| `images` | string[] URLs | yes / empty |
| `acreage` | number | yes |
| `rating` | number (0–5) | yes |

Amenity tokens display as readable labels (`dog-run` → "Dog run"); unknown tokens fall back to the token humanized, never dropped.

## Image URL transformation

`parks.sample.json` is never edited. At load time each image URL is mapped by filename stem to a bundled asset: `https://images.example.com/prospect-1.jpg` → `src/assets/park-images/prospect-1.png` (source art: `design/park-images/`). A URL with no matching asset passes through unchanged, so the `onError` fallback still applies. All 12 sample URLs have a match. Describe this transformation in the README.

## Known gaps in the sample (test fixtures)

| Park | Gap |
|---|---|
| `old-mill-botanical-garden` | `description: null` |
| `cedar-hill-nature-preserve` | `images: []`, `rating: null` |
| `east-ridge-trailhead` | `images: []` |
| `highland-dog-park` | `location.address` missing |
| all | image URLs are `images.example.com` placeholders that do not resolve; the transformation above maps them to bundled art, and an unmapped URL must still fall back cleanly |
