import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { display } from '../data/format.js'

const NO_ADDRESS = 'Address not listed'
const NO_HOURS = 'Hours not listed'

/** Phone-only preview card for a tapped marker. Focus moves to the card when it opens. */
export default function ParkPreview({ park, total, onClose }) {
  const cardRef = useRef(null)

  useEffect(() => {
    cardRef.current?.focus()
  }, [park.id])

  const address = display(park.address, NO_ADDRESS)
  const hours = display(park.hours, NO_HOURS)
  const headingId = `park-preview-${park.id}`

  return (
    <section
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
      className="focus-ring absolute inset-x-3 bottom-8 z-[1001] rounded-2xl bg-surface p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber">
            Park {park.number} of {total}
          </p>
          <h2 id={headingId} className="text-xl font-extrabold">
            {park.name}
          </h2>
          <p className="text-muted">{address.text}</p>
          <p className="text-muted">
            {hours.missing ? (
              hours.text
            ) : (
              <>
                <span className="sr-only">Hours: </span>
                {hours.text}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close park preview"
          onClick={onClose}
          className="focus-ring flex size-11 shrink-0 items-center justify-center rounded-full bg-missing-bg text-ink"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <Link
        to={`/parks/${park.id}`}
        className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-forest px-4 font-bold text-white hover:bg-forest-dark"
      >
        View park details
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </section>
  )
}
