/** Human label for a kebab-case amenity token: `dog-run` → "Dog run". Unknown tokens are humanized, never dropped. */
export function amenityLabel(token) {
  const spaced = String(token ?? '').trim().replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Rating in 0–5 as "4.7 / 5" (one decimal); `null` when there is no valid rating. */
export function formatRating(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  return `${n.toFixed(1)} / 5`
}

/** Acreage as "526 acres" or "1 acre"; `null` when there is no valid acreage. */
export function formatAcres(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  return `${n} ${n === 1 ? 'acre' : 'acres'}`
}

/** OpenStreetMap link centred on a point. */
export function osmUrl(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
}

/**
 * The one fallback rule: a value that is null, undefined, blank text or a non-finite number is
 * missing, and shows the labelled fallback instead. Never invents a value.
 */
export function display(value, fallback) {
  const missing =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (typeof value === 'number' && !Number.isFinite(value))
  return missing ? { text: fallback, missing: true } : { text: String(value), missing: false }
}
