// Null-safe park data layer. Normalization never invents values and never
// mutates the parsed source: missing scalars become `null`, missing arrays `[]`.

const imageModules = import.meta.glob('../assets/park-images/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

// filename stem (e.g. "prospect-1") -> bundled asset URL
const bundledImages = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => [fileStem(path), url]),
)

function fileStem(pathOrUrl) {
  const withoutQuery = pathOrUrl.split(/[?#]/)[0]
  const file = withoutQuery.split('/').pop() ?? ''
  const dot = file.lastIndexOf('.')
  return dot > 0 ? file.slice(0, dot) : file
}

/** Map a source image URL to the bundled art with the same filename stem; unmatched URLs pass through unchanged. */
export function resolveImageUrl(url) {
  if (typeof url !== 'string') return url
  return bundledImages[fileStem(url)] ?? url
}

function text(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed !== '' ? trimmed : null
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function numberInRange(value, min, max) {
  const n = finiteNumber(value)
  return n !== null && n >= min && n <= max ? n : null
}

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => text(item) !== null) : []
}

export function normalizePark(raw) {
  const park = raw && typeof raw === 'object' ? raw : {}
  const location = park.location && typeof park.location === 'object' ? park.location : {}
  const lat = numberInRange(location.lat, -90, 90)
  const lng = numberInRange(location.lng, -180, 180)
  const acreage = finiteNumber(park.acreage)
  const rating = finiteNumber(park.rating)

  return {
    id: text(park.id),
    name: text(park.name),
    number: null,
    description: text(park.description),
    address: text(location.address),
    lat,
    lng,
    hasCoords: lat !== null && lng !== null,
    amenities: stringList(park.amenities),
    hours: text(park.hours),
    images: stringList(park.images).map(resolveImageUrl),
    acreage: acreage !== null && acreage >= 0 ? acreage : null,
    rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
  }
}

function byName(a, b) {
  if (a.name === null) return b.name === null ? 0 : 1
  if (b.name === null) return -1
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
}

/** Normalize, sort A–Z by name and number 1–N. The number is assigned once here and shared by every view. */
export function normalizeParks(rawParks) {
  if (!Array.isArray(rawParks)) return []
  return rawParks
    .filter((raw) => raw && typeof raw === 'object')
    .map(normalizePark)
    .sort(byName)
    .map((park, index) => ({ ...park, number: index + 1 }))
}

export async function loadParks() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/parks.sample.json`)
  if (!response.ok) {
    throw new Error(`Failed to load parks: HTTP ${response.status}`)
  }
  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error('Failed to load parks: expected an array')
  }
  return normalizeParks(data)
}
