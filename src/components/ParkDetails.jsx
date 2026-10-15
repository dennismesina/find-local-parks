import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { amenityLabel, display, formatAcres, formatRating, osmUrl } from '../data/format.js'

// Fallback copy, word for word from design/README.md.
const NO_ADDRESS = 'Address not listed'
const NO_DESCRIPTION = 'No description has been provided for this park.'
const NO_RATING = 'Not yet rated'
const NO_PHOTOS = 'No photos for this park yet'
const NOT_LISTED = 'Not listed'
const NO_AMENITIES = 'No amenities listed'

function NoPhoto() {
  return (
    <div
      className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-missing-line bg-missing-bg p-4 text-center text-muted"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m3 16 5-5 4 4 3-3 6 6" />
        <circle cx="15.5" cy="8.5" r="1.5" />
      </svg>
      <p>{NO_PHOTOS}</p>
    </div>
  )
}

/** First photo only, with a "Photo 1 of N" label. A load failure swaps in the no-photo box. */
function PhotoArea({ park }) {
  const [failed, setFailed] = useState(false)
  const src = park.images[0]

  if (!src || failed) return <NoPhoto />

  return (
    <figure className="relative overflow-hidden rounded-[10px] bg-missing-bg">
      <img
        src={src}
        alt={`Photo of ${park.name}`}
        onError={() => setFailed(true)}
        className="block aspect-[16/9] w-full object-cover"
      />
      <figcaption className="absolute right-2 bottom-2 rounded-full bg-ink/85 px-2.5 py-0.5 text-[13px] font-semibold text-white">
        Photo 1 of {park.images.length}
      </figcaption>
    </figure>
  )
}

function FactTile({ label, value }) {
  const { missing, text } = value
  return (
    <div
      className={`min-w-0 break-words rounded-[10px] border p-3 ${
        missing ? 'border-dashed border-missing-line bg-missing-bg' : 'border-line bg-surface'
      }`}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={missing ? 'italic text-muted' : 'font-semibold'}>{text}</dd>
    </div>
  )
}

/** Full details for one normalized park. Every missing value shows its labelled fallback. */
export default function ParkDetails({ park }) {
  const headingRef = useRef(null)

  // Opening details (or moving to another park) puts focus on the heading.
  useEffect(() => {
    headingRef.current?.focus()
  }, [park.id])

  const address = display(park.address, NO_ADDRESS)
  const about = display(park.description, NO_DESCRIPTION)

  return (
    <article>
      <Link
        to="/"
        className="focus-ring inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg border border-line bg-surface px-3 font-semibold text-forest hover:border-forest"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
        All parks
      </Link>

      <div className="mt-4">
        <PhotoArea key={park.id} park={park} />
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-[28px] leading-tight font-extrabold"
      >
        {park.name}
      </h1>
      <p className="mt-1 text-muted">{address.text}</p>

      {park.hasCoords && (
        <p className="mt-2">
          <a
            href={osmUrl(park.lat, park.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex min-h-11 items-center rounded font-semibold text-forest underline"
          >
            Open in OpenStreetMap{' '}
            <span className="sr-only">(opens in new tab)</span>
          </a>
        </p>
      )}

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <FactTile label="Hours" value={display(park.hours, NOT_LISTED)} />
        <FactTile label="Size" value={display(formatAcres(park.acreage), NOT_LISTED)} />
        <FactTile label="Rating" value={display(formatRating(park.rating), NO_RATING)} />
      </dl>

      <section aria-labelledby="park-about" className="mt-5">
        <h2 id="park-about" className="text-lg font-bold">
          About
        </h2>
        <p className={`mt-1 ${about.missing ? 'italic text-muted' : ''}`}>{about.text}</p>
      </section>

      <section aria-labelledby="park-amenities" className="mt-5">
        <h2 id="park-amenities" className="text-lg font-bold">
          Amenities
        </h2>
        {park.amenities.length > 0 ? (
          <ul aria-label="Amenities" className="mt-2 flex flex-wrap gap-2">
            {park.amenities.map((token, index) => (
              <li
                key={`${index}-${token}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-tag-bg px-3 py-1 text-tag-fg"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {amenityLabel(token)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 italic text-muted">{NO_AMENITIES}</p>
        )}
      </section>
    </article>
  )
}
