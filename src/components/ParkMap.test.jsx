import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import L from 'leaflet'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeParks } from '../data/parks.js'
import ParkMap from './ParkMap.jsx'

const sample = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/parks.sample.json'), 'utf8'),
)

function parksFrom(mutate) {
  const data = structuredClone(sample)
  mutate?.(data)
  return normalizeParks(data)
}

function markerButtons() {
  return screen.queryAllByRole('button', { name: /^\d+\. / })
}

function markerFor(name) {
  return screen.getByRole('button', { name: new RegExp(`^\\d+\\. ${name}$`) })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ParkMap', () => {
  it('renders one numbered marker button per park, named "N. Park name", none amber', () => {
    const parks = parksFrom()
    render(<ParkMap parks={parks} selectedId={null} onActivate={() => {}} />)
    const buttons = markerButtons()
    expect(buttons).toHaveLength(12)
    parks.forEach((park, i) => {
      expect(buttons[i]).toHaveAccessibleName(`${park.number}. ${park.name}`)
      expect(buttons[i].tagName).toBe('BUTTON')
      expect(buttons[i]).toHaveAttribute('type', 'button')
      expect(buttons[i]).toHaveClass('focus-ring', 'bg-forest', 'size-11')
      expect(buttons[i]).not.toHaveClass('bg-amber')
    })
  })

  it('uses divIcons only: no default image icon, no default div-icon box', () => {
    const { container } = render(
      <ParkMap parks={parksFrom()} selectedId={null} onActivate={() => {}} />,
    )
    expect(container.querySelector('.leaflet-marker-icon img')).toBeNull()
    expect(container.querySelector('.leaflet-div-icon')).toBeNull()
    expect(container.querySelectorAll('.leaflet-marker-icon.park-marker')).toHaveLength(12)
  })

  it('makes the selected park amber and larger, and keeps the rest forest', () => {
    render(<ParkMap parks={parksFrom()} selectedId="prospect-park" onActivate={() => {}} />)
    const selected = markerFor('Prospect Park')
    expect(selected).toHaveClass('bg-amber', 'size-14')
    expect(selected).not.toHaveClass('bg-forest')
    for (const button of markerButtons().filter((b) => b !== selected)) {
      expect(button).toHaveClass('bg-forest', 'size-11')
      expect(button).not.toHaveClass('bg-amber')
    }
    // Larger icon box and raised above the others.
    const icon = selected.closest('.leaflet-marker-icon')
    expect(icon.style.width).toBe('56px')
    expect(Number(icon.style.zIndex)).toBeGreaterThan(
      Number(markerFor('Riverside Commons').closest('.leaflet-marker-icon').style.zIndex),
    )
  })

  it('gives a park without coordinates no marker', () => {
    const parks = parksFrom((data) => {
      delete data.find((p) => p.id === 'prospect-park').location.lat
    })
    render(<ParkMap parks={parks} selectedId={null} onActivate={() => {}} />)
    expect(markerButtons()).toHaveLength(11)
    expect(screen.queryByRole('button', { name: /Prospect Park/ })).toBeNull()
    // Numbering is the loader's, unchanged: Riverside Commons is still 9.
    expect(markerFor('Riverside Commons')).toHaveAccessibleName('9. Riverside Commons')
  })

  it('renders a map with no markers when no park has coordinates', () => {
    const parks = parksFrom((data) => {
      for (const park of data) delete park.location
    })
    const { container } = render(<ParkMap parks={parks} selectedId={null} onActivate={() => {}} />)
    expect(container.querySelector('.leaflet-container')).not.toBeNull()
    expect(markerButtons()).toHaveLength(0)
  })

  it('shows the OpenStreetMap attribution and OSM tiles', () => {
    const { container } = render(
      <ParkMap parks={parksFrom()} selectedId={null} onActivate={() => {}} />,
    )
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    )
    expect(container.querySelector('.leaflet-control-attribution')).toHaveTextContent(
      /OpenStreetMap contributors/,
    )
    const tile = container.querySelector('img.leaflet-tile')
    expect(tile?.getAttribute('src')).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/)
  })

  it('gives each marker button exactly one Tab stop, in order', async () => {
    const parks = parksFrom()
    const user = userEvent.setup()
    render(<ParkMap parks={parks} selectedId={null} onActivate={() => {}} />)
    const buttons = markerButtons()
    const reached = []
    for (let i = 0; i < 40; i++) {
      await user.tab()
      if (buttons.includes(document.activeElement)) reached.push(document.activeElement)
    }
    // Tab wraps around the document, so cut at the first repeat.
    const firstPass = reached.slice(0, buttons.length)
    expect(firstPass).toEqual(buttons)
    // The Leaflet marker wrapper itself is never a Tab stop.
    for (const button of buttons) {
      expect(button.closest('.leaflet-marker-icon')).not.toHaveAttribute('tabindex')
    }
  })

  it('calls onActivate with the park id on click and on Enter', async () => {
    const onActivate = vi.fn()
    const user = userEvent.setup()
    render(<ParkMap parks={parksFrom()} selectedId={null} onActivate={onActivate} />)
    await user.click(markerFor('Prospect Park'))
    expect(onActivate).toHaveBeenLastCalledWith('prospect-park')

    markerFor('Highland Dog Park').focus()
    await user.keyboard('{Enter}')
    expect(onActivate).toHaveBeenLastCalledWith('highland-dog-park')
    expect(onActivate).toHaveBeenCalledTimes(2)
  })

  it('never requests the user location', () => {
    const geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    }
    vi.stubGlobal('navigator', { ...navigator, geolocation })
    render(<ParkMap parks={parksFrom()} selectedId="prospect-park" onActivate={() => {}} />)
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(geolocation.watchPosition).not.toHaveBeenCalled()
  })

  it('escapes park names in the marker HTML', () => {
    const parks = parksFrom((data) => {
      data.find((p) => p.id === 'prospect-park').name = 'Prospect <b>Park</b>'
    })
    render(<ParkMap parks={parks} selectedId={null} onActivate={() => {}} />)
    expect(
      screen.getByRole('button', { name: /Prospect <b>Park<\/b>$/ }),
    ).toBeInTheDocument()
  })

  it('renders edge to edge (no rounded corners)', () => {
    const { container } = render(
      <ParkMap parks={parksFrom()} selectedId={null} onActivate={() => {}} />,
    )
    expect(container.querySelector('.leaflet-container').className).not.toMatch(/rounded/)
  })

  it('calls invalidateSize when the container resizes, and fits the view once it first has a size', () => {
    const observers = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback) {
          this.callback = callback
          this.observe = vi.fn()
          this.disconnect = vi.fn()
          observers.push(this)
        }
      },
    )
    const invalidate = vi.spyOn(L.Map.prototype, 'invalidateSize')
    const fit = vi.spyOn(L.Map.prototype, 'fitBounds')
    const { container, unmount } = render(
      <ParkMap parks={parksFrom()} selectedId={null} onActivate={() => {}} />,
    )
    expect(observers).toHaveLength(1)
    const observer = observers[0]
    expect(observer.observe).toHaveBeenCalledWith(container.querySelector('.leaflet-container'))
    invalidate.mockClear()
    fit.mockClear()

    // Hidden pane (display:none): zero size is ignored so the view survives.
    act(() => observer.callback([{ contentRect: { width: 0, height: 0 } }]))
    expect(invalidate).not.toHaveBeenCalled()

    // Shown: Leaflet re-measures; jsdom built the map at 0×0, so the initial view is re-fitted once.
    act(() => observer.callback([{ contentRect: { width: 375, height: 600 } }]))
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(fit).toHaveBeenCalledTimes(1)

    act(() => observer.callback([{ contentRect: { width: 1280, height: 700 } }]))
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(fit).toHaveBeenCalledTimes(1)

    unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})
