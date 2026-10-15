import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation, useMatch, useNavigate, useParams } from 'react-router'
import ParkDetails from './components/ParkDetails.jsx'
import ParkList from './components/ParkList.jsx'
import ParkMap from './components/ParkMap.jsx'
import ParkPreview from './components/ParkPreview.jsx'
import { useIsDesktop } from './data/useIsDesktop.js'
import { useParks } from './data/useParks.js'

const cardClass = 'rounded-[10px] border border-line bg-surface p-4'
const linkClass = 'focus-ring rounded text-forest underline'

function NotFound() {
  return (
    <div>
      <h1 className="text-lg font-bold">Park not found</h1>
      <p className="mt-2">
        <Link to="/" className={linkClass}>
          Back to all parks
        </Link>
      </p>
    </div>
  )
}

function ParkDetailsRoute({ parks, onOpen }) {
  const { id } = useParams()
  const park = parks.find((p) => p.id === id)

  // Record the opened park so the list can return focus to its card.
  useEffect(() => {
    if (park) onOpen(park.id)
  }, [park, onOpen])

  if (!park) return <NotFound />

  return <ParkDetails park={park} />
}

const listHeadingClass = 'text-[22px] font-extrabold'

function TreeIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22v-6" />
      <path d="M12 16 6 16 12 3 18 16Z" />
    </svg>
  )
}

/**
 * Green app header. On phone details it shows only the "All parks" link; the app name and
 * subtitle are CSS-hidden there (and that link is CSS-hidden on desktop).
 */
function Header({ count, detailsOpen }) {
  return (
    <header className="bg-forest text-white">
      <div
        className={`${
          detailsOpen ? 'hidden md:flex' : 'flex'
        } flex-wrap items-center justify-between gap-4 px-4 py-3.5 md:px-6`}
      >
        <div className="flex items-center gap-2.5 md:gap-3">
          <TreeIcon className="size-6 shrink-0 md:size-7" />
          <div className="flex flex-col">
            <p className="text-lg font-extrabold tracking-[-0.01em] md:text-xl">Find a Park</p>
            <p className="text-[13px] text-[#D7E8DD] md:hidden">
              {count != null ? `${count} parks · New York City area` : 'New York City area'}
            </p>
            <p className="hidden text-sm text-[#D7E8DD] md:block">Parks in the New York City area</p>
          </div>
        </div>
        {count != null && <p className="hidden text-sm text-[#D7E8DD] md:block">{count} parks</p>}
      </div>
      {detailsOpen && (
        <div className="flex items-center p-2 md:hidden">
          <Link
            to="/"
            className="focus-ring flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-base font-semibold text-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            All parks
          </Link>
        </div>
      )}
    </header>
  )
}

const TOGGLE_BASE = 'focus-ring min-h-11 cursor-pointer rounded-lg text-[15px]'
const TOGGLE_ON = `${TOGGLE_BASE} bg-surface font-bold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]`
const TOGGLE_OFF = `${TOGGLE_BASE} bg-transparent font-semibold text-[#3F4A44]`

/** Phone-only List / Map switch: two toggle buttons, CSS-hidden at desktop width. */
function ViewToggle({ view, onChange }) {
  return (
    <div
      role="group"
      aria-label="View"
      className="mx-4 my-3 grid grid-cols-2 gap-1 rounded-[10px] bg-toggle-bg p-1 md:hidden"
    >
      {['list', 'map'].map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={view === value ? TOGGLE_ON : TOGGLE_OFF}
        >
          {value === 'list' ? 'List' : 'Map'}
        </button>
      ))}
    </div>
  )
}

function ParksPanel({ status, parks, retry, focusParkId, setLastParkId }) {
  const clearLastParkId = useCallback(() => setLastParkId(null), [setLastParkId])

  if (status === 'loading') {
    return (
      <div>
        <h1 className={listHeadingClass}>All parks</h1>
        <p role="status" className={`mt-4 ${cardClass}`}>
          Loading parks…
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div>
        <h1 className={listHeadingClass}>All parks</h1>
        <div role="alert" className={`mt-4 ${cardClass}`}>
          <p>Couldn't load parks. Try again.</p>
          <button
            type="button"
            onClick={retry}
            className="focus-ring mt-3 min-h-11 rounded-lg bg-forest px-4 font-semibold text-white hover:bg-forest-dark"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ParkList parks={parks} focusParkId={focusParkId} onFocusUsed={clearLastParkId} />
        }
      />
      <Route
        path="/parks/:id"
        element={<ParkDetailsRoute parks={parks} onOpen={setLastParkId} />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const { status, parks, retry } = useParks()
  // Id of the last-opened park. Lives in App state (not location.state) so
  // focus can return to its card after browser Back, which carries no state.
  const [lastParkId, setLastParkId] = useState(null)

  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const selectedId = useMatch('/parks/:id')?.params.id ?? null
  // Phone-only marker preview; cleared on any navigation and when the viewport becomes desktop.
  const [previewId, setPreviewId] = useState(null)
  // Marker button to refocus after the preview closes.
  const [focusMarkerId, setFocusMarkerId] = useState(null)
  const clearFocusMarkerId = useCallback(() => setFocusMarkerId(null), [])

  useEffect(() => {
    setPreviewId(null)
  }, [location.key])

  useEffect(() => {
    if (isDesktop && previewId) {
      // Focus may be inside the preview: hand it back to the marker, as closing does.
      setFocusMarkerId(previewId)
      setPreviewId(null)
    }
  }, [isDesktop, previewId])

  // Phone List / Map tab. Ignored at desktop width, and kept while details are open so
  // Back (link or browser) returns to the tab the details were opened from.
  const [view, setView] = useState('list')

  const changeView = useCallback((next) => {
    // Switching to List closes the map preview.
    if (next === 'list') setPreviewId(null)
    setView(next)
  }, [])

  const selectedPark =
    status === 'ready' && selectedId ? (parks.find((park) => park.id === selectedId) ?? null) : null

  // Details set their own title; every other view is plain "Find a Park".
  useEffect(() => {
    if (!selectedPark) document.title = 'Find a Park'
  }, [selectedPark])

  // Phone: back from details opened via the map lands on the Map tab with focus on that
  // park's marker instead of its list card.
  const returnToMarker = !isDesktop && view === 'map'
  useEffect(() => {
    if (selectedId || !returnToMarker || !lastParkId) return
    setFocusMarkerId(lastParkId)
    setLastParkId(null)
  }, [selectedId, returnToMarker, lastParkId])

  const activePreviewId = isDesktop ? null : previewId
  const highlightedId = selectedId ?? activePreviewId
  const previewPark =
    status === 'ready' && activePreviewId
      ? (parks.find((park) => park.id === activePreviewId) ?? null)
      : null

  const activateMarker = useCallback(
    (id) => {
      if (isDesktop) {
        // Re-activating the park already open would push a duplicate history entry.
        if (id !== selectedId) navigate(`/parks/${id}`)
      } else setPreviewId(id)
    },
    [isDesktop, navigate, selectedId],
  )

  const closePreview = useCallback(() => {
    setFocusMarkerId(previewId)
    setPreviewId(null)
  }, [previewId])

  const detailsOpen = selectedId !== null
  const mapTab = status === 'ready' && !detailsOpen && view === 'map'
  // Loading/error always show the aside (status card, Retry).
  const listHidden = mapTab
  const mapHidden = detailsOpen || view === 'list'

  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <Header count={status === 'ready' ? parks.length : null} detailsOpen={detailsOpen} />
      <main className="flex flex-1 flex-col md:min-h-0 md:flex-row">
        {status === 'ready' && !detailsOpen && <ViewToggle view={view} onChange={changeView} />}
        <aside
          aria-label="Parks"
          className={`${
            listHidden ? 'hidden md:block' : ''
          } relative border-line p-4 md:w-[400px] md:shrink-0 md:overflow-y-auto md:border-r md:p-5`}
        >
          <ParksPanel
            status={status}
            parks={parks}
            retry={retry}
            focusParkId={returnToMarker ? null : lastParkId}
            setLastParkId={setLastParkId}
          />
        </aside>
        <section
          aria-label="Map of parks"
          className={`${mapHidden ? 'hidden md:block' : ''} relative min-h-[320px] flex-1`}
        >
          {/* The phone Map tab hides the aside and its h1, so the map pane names the view. */}
          {mapTab && <h1 className="sr-only md:hidden">Map of parks</h1>}
          {status === 'ready' && (
            <div className="absolute inset-0 isolate">
              <ParkMap
                parks={parks}
                selectedId={highlightedId}
                isDesktop={isDesktop}
                onActivate={activateMarker}
                focusId={focusMarkerId}
                onFocused={clearFocusMarkerId}
              />
              {previewPark && (
                <ParkPreview
                  key={previewPark.id}
                  park={previewPark}
                  total={parks.length}
                  onClose={closePreview}
                />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
