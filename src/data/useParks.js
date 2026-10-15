import { useCallback, useEffect, useState } from 'react'
import { loadParks } from './parks.js'

/** Loads parks once; `retry` refetches after an error. */
export function useParks() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', parks: [] })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', parks: [] })
    loadParks().then(
      (parks) => {
        if (!cancelled) setState({ status: 'ready', parks })
      },
      () => {
        if (!cancelled) setState({ status: 'error', parks: [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { status: state.status, parks: state.parks, retry }
}
