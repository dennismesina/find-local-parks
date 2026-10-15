# Stack

All choices confirmed by the user.

| Concern | Choice | Why |
|---|---|---|
| UI | React | User decision. |
| Build tool | Vite | Fast scaffold; one `npm install` + `npm run dev`. |
| Styling | Tailwind CSS, mobile-first | User decision; responsive by default. |
| Map | `react-leaflet` + Leaflet | User decision; no API key. |
| Tiles | OpenStreetMap standard tiles, with attribution | Keyless; satisfies the no-credentials constraint. |
| Data | Static import of `parks.sample.json` (copied into the app) | No backend. |
| Routing | Path-based `/parks/:id` for park details; `/` is the list | Linkable details, working Back. Supersedes the `?park=` option in `design/README.md`. |
| Tests | Vitest + React Testing Library | Cover every known gap in `park-data.md` (null description, empty images, null rating, missing address, failing image URLs) plus the keyboard list→details flow. |

## Conventions

- Map initial view fits the bounds of parks that have coordinates; never depends on geolocation.
- Leaflet's default marker icons need explicit asset imports under Vite, or markers render as broken images.
- Visual design, tokens, missing-data display copy, and accessibility rules come from `design/README.md` (adopted companion) and `design/screens/`.
- Park images: pixel art lives in `src/assets/park-images/` (moved from `design/park-images/`) and is resolved via the load-time URL transformation in `park-data.md`; the image-failure fallback is still required.
