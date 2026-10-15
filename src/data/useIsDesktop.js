import { useEffect, useState } from 'react'

const QUERY = '(min-width: 768px)'

function getMatch() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(QUERY).matches
}

/** True at viewport widths ≥ 768px. Without `matchMedia` (e.g. jsdom), assumes desktop. */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsDesktop(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
