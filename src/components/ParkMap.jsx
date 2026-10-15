import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// No-coordinates fallback: a fixed view over New York City.
const NYC_CENTER = [40.7128, -74.006]
const NYC_ZOOM = 11

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Full literal class strings so Tailwind's scanner picks them up.
const BUTTON_CLASS =
  'focus-ring flex size-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-forest text-base font-bold text-white shadow-md'
const SELECTED_BUTTON_CLASS =
  'focus-ring flex size-14 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-amber text-lg font-bold text-white shadow-lg'
const SIZE = 44
const SELECTED_SIZE = 56

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function markerIcon(park, selected) {
  const size = selected ? SELECTED_SIZE : SIZE
  const name = escapeHtml(`${park.number}. ${park.name}`)
  return L.divIcon({
    className: 'park-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<button type="button" data-park-id="${escapeHtml(park.id)}" class="${
        selected ? SELECTED_BUTTON_CLASS : BUTTON_CLASS
      }">` +
      `<span aria-hidden="true">${escapeHtml(park.number)}</span>` +
      `<span class="sr-only">${name}</span>` +
      `</button>`,
  })
}

/**
 * OpenStreetMap map of the parks that have coordinates. Each marker is a single focusable
 * `<button>` named "N. Park name"; the highlighted park's marker is amber and larger.
 * `isDesktop` is part of the props contract but the map renders the same at every width; the
 * caller decides what activation does. `focusId` asks the map to put focus on that park's marker button.
 */
export default function ParkMap({ parks, selectedId, onActivate, focusId, onFocused }) {
  const wrapperRef = useRef(null)
  const mapped = useMemo(() => parks.filter((park) => park.hasCoords), [parks])

  // Stable icons per park and state, so unrelated renders never replace a marker's DOM.
  const icons = useMemo(() => {
    const cache = new Map()
    for (const park of mapped) {
      cache.set(park.id, { normal: markerIcon(park, false), selected: markerIcon(park, true) })
    }
    return cache
  }, [mapped])

  const bounds = useMemo(
    () => (mapped.length > 0 ? L.latLngBounds(mapped.map((p) => [p.lat, p.lng])) : null),
    [mapped],
  )

  // Runs after the markers' own effects, so it targets the current icon element.
  useEffect(() => {
    if (!focusId) return
    const button = wrapperRef.current?.querySelector(
      `button[data-park-id="${CSS.escape(focusId)}"]`,
    )
    button?.focus()
    onFocused?.()
  }, [focusId, selectedId, onFocused])

  const viewProps = bounds
    ? { bounds, boundsOptions: { padding: [32, 32], maxZoom: 15 } }
    : { center: NYC_CENTER, zoom: NYC_ZOOM }

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <MapContainer {...viewProps} className="h-full w-full rounded-[10px]">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {mapped.map((park) => {
          const selected = park.id === selectedId
          const icon = icons.get(park.id)
          return (
            <Marker
              key={park.id}
              position={[park.lat, park.lng]}
              icon={selected ? icon.selected : icon.normal}
              keyboard={false}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{ click: () => onActivate?.(park.id) }}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}
