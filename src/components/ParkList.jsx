import { Fragment, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { amenityLabel } from '../data/format.js'

const MAX_TAGS = 3

function ParkCard({ park, linkRef }) {
  const shown = park.amenities.slice(0, MAX_TAGS)
  const extra = park.amenities.length - shown.length
  const tags = shown.map(amenityLabel)
  if (extra > 0) tags.push(`+${extra} more`)

  return (
    <li>
      <Link
        ref={linkRef}
        to={`/parks/${park.id}`}
        className="focus-ring flex min-h-11 items-start gap-3 rounded-[10px] border border-line bg-surface p-3.5 hover:border-forest"
      >
        <span
          aria-hidden="true"
          className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-white"
        >
          {park.number}
        </span>
        <span className="sr-only">{park.number}.</span>{' '}
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold">{park.name}</span>{' '}
          {park.address ? (
            <span className="mt-1 block text-[15px] text-muted">{park.address}</span>
          ) : (
            <span className="mt-1 block text-[15px] text-muted">Address not listed</span>
          )}{' '}
          {tags.length > 0 && (
            <span data-testid="park-tags" className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((label, index) => (
                <Fragment key={`${index}-${label}`}>
                  <span className="rounded-full bg-tag-bg px-2 py-[3px] text-[13px] text-tag-fg">
                    {label}
                  </span>{' '}
                </Fragment>
              ))}
            </span>
          )}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 shrink-0 self-center text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  )
}

/**
 * The "All parks" list. Parks are rendered in loader order with loader numbers.
 * If `focusParkId` matches a card on mount, that card's link gets focus and
 * `onFocusUsed` is called so a later fresh visit does not steal focus.
 */
export default function ParkList({ parks, focusParkId, onFocusUsed }) {
  const linkRefs = useRef(new Map())

  useEffect(() => {
    if (!focusParkId) return
    linkRefs.current.get(focusParkId)?.focus()
    onFocusUsed?.()
    // Run once on mount: the id is read once, then cleared by the parent.
  }, [])

  return (
    <div>
      <h1 className="text-[22px] font-extrabold">All parks</h1>
      <p className="mt-1 text-muted">Choose a park to see hours, amenities and directions.</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {parks.map((park) => (
          <ParkCard
            key={park.id}
            park={park}
            linkRef={(node) => {
              if (node) linkRefs.current.set(park.id, node)
              else linkRefs.current.delete(park.id)
            }}
          />
        ))}
      </ul>
    </div>
  )
}
