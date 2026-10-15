import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useParams } from 'react-router'
import ParkList from './components/ParkList.jsx'
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

function ParkDetailsPlaceholder({ parks, onOpen }) {
  const { id } = useParams()
  const park = parks.find((p) => p.id === id)

  // Record the opened park so the list can return focus to its card.
  useEffect(() => {
    if (park) onOpen(park.id)
  }, [park, onOpen])

  if (!park) return <NotFound />

  return <h1 className="text-[28px] font-extrabold">{park.name}</h1>
}

function ParksPanel({ status, parks, retry, lastParkId, setLastParkId }) {
  const clearLastParkId = useCallback(() => setLastParkId(null), [setLastParkId])

  if (status === 'loading') {
    return (
      <p role="status" className={cardClass}>
        Loading parks…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div role="alert" className={cardClass}>
        <p>Couldn't load parks. Try again.</p>
        <button
          type="button"
          onClick={retry}
          className="focus-ring mt-3 min-h-11 rounded-lg bg-forest px-4 font-semibold text-white hover:bg-forest-dark"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ParkList parks={parks} focusParkId={lastParkId} onFocusUsed={clearLastParkId} />
        }
      />
      <Route
        path="/parks/:id"
        element={<ParkDetailsPlaceholder parks={parks} onOpen={setLastParkId} />}
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-forest px-5 py-4 text-white">
        <p className="text-xl font-extrabold">Find a Park</p>
        <p className="text-sm">New York City area</p>
        {status === 'ready' && <p className="text-sm">{parks.length} parks</p>}
      </header>
      <main className="flex flex-1 flex-col">
        <aside aria-label="Parks" className="p-5">
          <ParksPanel
            status={status}
            parks={parks}
            retry={retry}
            lastParkId={lastParkId}
            setLastParkId={setLastParkId}
          />
        </aside>
        <section aria-label="Map of parks" className="flex-1 p-5">
          <p className="text-muted">Map coming soon.</p>
        </section>
      </main>
    </div>
  )
}
