import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

const sample = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/parks.sample.json'), 'utf8'),
)

const okResponse = () => ({ ok: true, json: async () => structuredClone(sample) })
const ERROR_TEXT = "Couldn't load parks. Try again."

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('App shell', () => {
  it('goes loading → error → retry → ready', async () => {
    let rejectFirst
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject
          }),
      )
      .mockResolvedValueOnce(okResponse())
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAt('/')
    const aside = screen.getByRole('complementary', { name: 'Parks' })
    expect(within(aside).getByText('Loading parks…')).toBeInTheDocument()

    rejectFirst(new TypeError('network down'))
    expect(await within(aside).findByText(ERROR_TEXT)).toBeInTheDocument()

    await user.click(within(aside).getByRole('button', { name: 'Retry' }))
    expect(await within(aside).findByRole('list')).toBeInTheDocument()
    expect(within(aside).getByRole('heading', { level: 1, name: 'All parks' })).toBeInTheDocument()
    expect(screen.getByText('12 parks')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the error state for a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    renderAt('/')
    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('renders the landmarks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Parks' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Map of parks' })).toBeInTheDocument()
    expect(await within(screen.getByRole('complementary')).findByRole('list')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'All parks' })).toBeInTheDocument()
  })

  it('shows the park name on /parks/:id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/parks/prospect-park')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prospect Park' }),
    ).toBeInTheDocument()
  })

  it('shows "Park not found" with a link back for an unmatched path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/foo')
    expect(await screen.findByRole('heading', { name: 'Park not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to all parks' })).toHaveAttribute('href', '/')
  })

  it('shows "Park not found" with a link back for an unknown id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    const user = userEvent.setup()
    renderAt('/parks/nope')
    expect(await screen.findByRole('heading', { name: 'Park not found' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to all parks' }))
    expect(await screen.findByRole('heading', { name: 'All parks' })).toBeInTheDocument()
  })

  it('returns to / on history Back after navigating to a park', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    const user = userEvent.setup()

    function TestNav() {
      const navigate = useNavigate()
      return (
        <>
          <button type="button" onClick={() => navigate('/parks/prospect-park')}>
            go
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            back
          </button>
        </>
      )
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <TestNav />
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('list')
    await user.click(screen.getByRole('button', { name: 'go' }))
    expect(await screen.findByRole('heading', { name: 'Prospect Park' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'back' }))
    expect(await screen.findByRole('heading', { name: 'All parks' })).toBeInTheDocument()
  })
})

const SORTED_NAMES = [
  'Cedar Hill Nature Preserve',
  'Central Plaza Green',
  'East Ridge Trailhead',
  'Highland Dog Park',
  'Hillcrest Skate Park',
  'Lakeshore Point',
  'Old Mill Botanical Garden',
  'Prospect Park',
  'Riverside Commons',
  'Sunset Playground',
  'Veterans Memorial Field',
  'Willow Creek Wetlands',
]

async function findCards() {
  const list = await screen.findByRole('list')
  return within(list).getAllByRole('listitem')
}

function cardFor(name) {
  return screen
    .getAllByRole('listitem')
    .find((li) => within(li).queryByText(name, { exact: true }) !== null)
}

describe('Park list', () => {
  it('renders all 12 parks in A–Z order inside one <ul> under the h1 and hint', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    const cards = await findCards()
    expect(screen.getAllByRole('list')).toHaveLength(1)
    expect(cards).toHaveLength(12)

    const heading = screen.getByRole('heading', { level: 1, name: 'All parks' })
    const hint = screen.getByText('Choose a park to see hours, amenities and directions.')
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')
    expect(heading.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(hint.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    cards.forEach((card, i) => {
      const links = within(card).getAllByRole('link')
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAccessibleName(
        expect.stringMatching(new RegExp(`^${i + 1}\\. ${SORTED_NAMES[i]} `)),
      )
      expect(within(card).getByText(String(i + 1))).toBeInTheDocument()
      expect(within(card).getByText(SORTED_NAMES[i])).toBeInTheDocument()
      expect(within(card).queryByRole('button')).toBeNull()
    })
  })

  it('links each card to /parks/:id with the focus-ring class and a 44px target', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    await findCards()
    const link = within(cardFor('Prospect Park')).getByRole('link')
    expect(link).toHaveAttribute('href', '/parks/prospect-park')
    expect(link).toHaveClass('focus-ring')
    expect(link).toHaveClass('min-h-11')
  })

  it('shows "Address not listed" in muted text for a missing address', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    await findCards()
    const fallback = within(cardFor('Highland Dog Park')).getByText('Address not listed')
    expect(fallback).toHaveClass('text-muted')
    expect(within(cardFor('Prospect Park')).getByText('Brooklyn, NY 11225')).toBeInTheDocument()
    expect(within(cardFor('Prospect Park')).queryByText('Address not listed')).toBeNull()
  })

  it('shows the first 3 amenities plus "+N more" when there are more than 3', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    await findCards()
    const card = cardFor('Prospect Park')
    expect(within(card).getByText('Playground')).toBeInTheDocument()
    expect(within(card).getByText('Dog run')).toBeInTheDocument()
    expect(within(card).getByText('Trails')).toBeInTheDocument()
    expect(within(card).queryByText('Restrooms')).toBeNull()
    expect(within(card).getByText('+4 more')).toBeInTheDocument()
  })

  it('shows all amenities and no "+N more" when there are 3 or fewer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    await findCards()
    const card = cardFor('East Ridge Trailhead')
    expect(within(card).getByText('Trails')).toBeInTheDocument()
    expect(within(card).getByText('Parking')).toBeInTheDocument()
    expect(within(card).getByText('Wildlife viewing')).toBeInTheDocument()
    expect(within(card).queryByText(/more$/)).toBeNull()
  })

  it('humanizes amenity labels', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    await findCards()
    expect(within(cardFor('Highland Dog Park')).getByText('Dog run')).toBeInTheDocument()
    expect(within(cardFor('Central Plaza Green')).getByText('Wifi')).toBeInTheDocument()
    expect(within(cardFor('Central Plaza Green')).getByText('Event lawn')).toBeInTheDocument()
  })

  it('renders no tag row for a park with no amenities', async () => {
    const data = structuredClone(sample)
    data.find((p) => p.id === 'east-ridge-trailhead').amenities = []
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
    renderAt('/')
    await findCards()
    const card = cardFor('East Ridge Trailhead')
    expect(within(card).queryByText('Trails')).toBeNull()
    expect(within(card).queryByTestId('park-tags')).toBeNull()
  })

  it('does not auto-focus any card on a first visit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    renderAt('/')
    await findCards()
    expect(document.activeElement).toBe(document.body)
  })

  it('gives each card exactly one Tab stop', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    const user = userEvent.setup()
    renderAt('/')
    const cards = await findCards()
    // Start after the List / Map toggle, which precedes the list in DOM order.
    screen.getByRole('button', { name: 'Map' }).focus()
    for (const card of cards) {
      await user.tab()
      expect(document.activeElement).toBe(within(card).getByRole('link'))
    }
  })

  it('opens details when Enter is pressed on a focused card', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    screen.getByRole('button', { name: 'Map' }).focus()
    await user.tab()
    expect(document.activeElement).toHaveAttribute('href', '/parks/cedar-hill-nature-preserve')
    await user.keyboard('{Enter}')
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: 'Cedar Hill Nature Preserve',
    })
    expect(heading).toHaveFocus()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'All parks' })).toBeNull()
  })

  it('opens details when a card is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    await user.click(within(cardFor('Prospect Park')).getByRole('link'))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prospect Park' }),
    ).toBeInTheDocument()
  })

  it('returns focus to the originating card on history Back, and only once', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
    const user = userEvent.setup()

    function TestNav() {
      const navigate = useNavigate()
      return (
        <>
          <button type="button" onClick={() => navigate(-1)}>
            back
          </button>
          <button type="button" onClick={() => navigate('/parks/nope')}>
            elsewhere
          </button>
          <button type="button" onClick={() => navigate('/')}>
            home
          </button>
        </>
      )
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <TestNav />
        <App />
      </MemoryRouter>,
    )
    await findCards()
    await user.click(within(cardFor('Highland Dog Park')).getByRole('link'))
    expect(await screen.findByRole('heading', { name: 'Highland Dog Park' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'back' }))
    await findCards()
    expect(document.activeElement).toBe(within(cardFor('Highland Dog Park')).getByRole('link'))

    // The id was consumed: a later fresh visit to / does not steal focus.
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(await screen.findByRole('heading', { name: 'Park not found' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'home' }))
    await findCards()
    expect(screen.getAllByRole('listitem').map((li) => within(li).getByRole('link'))).not.toContain(
      document.activeElement,
    )
  })
})

function stubData(mutate) {
  const data = structuredClone(sample)
  mutate?.(data)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }))
}

async function openDetails(id, mutate) {
  stubData(mutate)
  renderAt(`/parks/${id}`)
  await screen.findByRole('article')
  return screen.getByRole('heading', { level: 1 })
}

function tile(label) {
  const dt = screen.getByText(label, { selector: 'dt' })
  return { box: dt.parentElement, value: dt.nextElementSibling }
}

function expectMissingTile(label, text) {
  const { box, value } = tile(label)
  expect(value).toHaveTextContent(text)
  expect(value).toHaveClass('italic', 'text-muted')
  expect(box).toHaveClass('border-dashed', 'border-missing-line', 'bg-missing-bg')
}

function amenityLabels() {
  const list = screen.getByRole('list', { name: 'Amenities' })
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.textContent)
}

describe('Park details', () => {
  it('shows every section in order for a park with full data', async () => {
    const heading = await openDetails('prospect-park')
    expect(heading).toHaveTextContent('Prospect Park')

    const back = within(screen.getByRole('complementary', { name: 'Parks' })).getByRole('link', {
      name: 'All parks',
    })
    const img = screen.getByRole('img', { name: 'Photo of Prospect Park' })
    const photoLabel = screen.getByText('Photo 1 of 2')
    const address = screen.getByText('Brooklyn, NY 11225')
    const osm = screen.getByRole('link', { name: /^Open in OpenStreetMap/ })
    const facts = screen.getByText('Hours', { selector: 'dt' }).closest('dl')
    const about = screen.getByRole('heading', { level: 2, name: 'About' })
    const amenities = screen.getByRole('heading', { level: 2, name: 'Amenities' })

    const order = [back, img, photoLabel, heading, address, osm, facts, about, amenities]
    for (let i = 1; i < order.length; i++) {
      expect(
        order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }

    expect(screen.getByRole('article').querySelectorAll('img')).toHaveLength(1)
    expect(osm).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/?mlat=40.6602&mlon=-73.969#map=16/40.6602/-73.969',
    )
    expect(tile('Hours').value).toHaveTextContent('6:00 AM - 1:00 AM')
    expect(tile('Size').value).toHaveTextContent('526 acres')
    expect(tile('Rating').value).toHaveTextContent('4.7 / 5')
    for (const label of ['Hours', 'Size', 'Rating']) {
      expect(tile(label).box).not.toHaveClass('border-dashed')
      expect(tile(label).value).not.toHaveClass('italic')
    }
    expect(screen.getByText(/A 526-acre park in the heart of Brooklyn/)).not.toHaveClass('italic')
    expect(amenityLabels()).toEqual([
      'Playground',
      'Dog run',
      'Trails',
      'Restrooms',
      'Parking',
      'Lake',
      'Picnic areas',
    ])
    const items = within(screen.getByRole('list', { name: 'Amenities' })).getAllByRole('listitem')
    items.forEach((li) => expect(li.querySelector('svg')).not.toBeNull())
  })

  it('gives the back and OSM links a focus ring and a 44px target', async () => {
    await openDetails('prospect-park')
    const back = within(screen.getByRole('complementary', { name: 'Parks' })).getByRole('link', {
      name: 'All parks',
    })
    const osm = screen.getByRole('link', { name: /^Open in OpenStreetMap/ })
    expect(back).toHaveAttribute('href', '/')
    for (const link of [back, osm]) {
      expect(link).toHaveClass('focus-ring', 'min-h-11')
    }
  })

  it('opens OpenStreetMap in a new tab and says so to screen readers', async () => {
    await openDetails('prospect-park')
    const osm = screen.getByRole('link', { name: 'Open in OpenStreetMap (opens in new tab)' })
    expect(osm).toHaveAttribute('target', '_blank')
    expect(osm).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows "Address not listed" in muted text for a missing address', async () => {
    await openDetails('highland-dog-park')
    expect(screen.getByText('Address not listed')).toHaveClass('text-muted')
  })

  it('shows the description fallback for a null description', async () => {
    await openDetails('old-mill-botanical-garden')
    expect(screen.getByText('No description has been provided for this park.')).toHaveClass(
      'italic',
      'text-muted',
    )
  })

  it('shows "Not yet rated" in the muted tile for a null rating, never 0', async () => {
    await openDetails('cedar-hill-nature-preserve')
    expectMissingTile('Rating', 'Not yet rated')
    expect(tile('Rating').value).not.toHaveTextContent(/0/)
  })

  it.each(['cedar-hill-nature-preserve', 'east-ridge-trailhead'])(
    'shows the no-photo box and no <img> for %s',
    async (id) => {
      await openDetails(id)
      expect(screen.getByText('No photos for this park yet')).toBeInTheDocument()
      expect(screen.getByRole('article').querySelector('img')).toBeNull()
      expect(screen.queryByText(/^Photo 1 of/)).toBeNull()
    },
  )

  it('replaces a failing image with the no-photo box', async () => {
    await openDetails('prospect-park')
    fireEvent.error(screen.getByRole('img', { name: 'Photo of Prospect Park' }))
    expect(screen.getByText('No photos for this park yet')).toBeInTheDocument()
    expect(screen.getByRole('article').querySelector('img')).toBeNull()
    expect(screen.queryByText(/^Photo 1 of/)).toBeNull()
  })

  it('passes an unmatched image URL through and falls back when it fails', async () => {
    await openDetails('prospect-park', (data) => {
      data.find((p) => p.id === 'prospect-park').images = ['https://nowhere.example/x.jpg']
    })
    const img = screen.getByRole('img', { name: 'Photo of Prospect Park' })
    expect(img).toHaveAttribute('src', 'https://nowhere.example/x.jpg')
    expect(screen.getByText('Photo 1 of 1')).toBeInTheDocument()
    fireEvent.error(img)
    expect(screen.getByText('No photos for this park yet')).toBeInTheDocument()
  })

  it('shows "Not listed" in muted tiles for missing hours and acreage', async () => {
    await openDetails('prospect-park', (data) => {
      const park = data.find((p) => p.id === 'prospect-park')
      delete park.hours
      park.acreage = null
    })
    expectMissingTile('Hours', 'Not listed')
    expectMissingTile('Size', 'Not listed')
  })

  it('shows "1 acre" for an acreage of 1', async () => {
    await openDetails('prospect-park', (data) => {
      data.find((p) => p.id === 'prospect-park').acreage = 1
    })
    expect(tile('Size').value).toHaveTextContent(/^1 acre$/)
  })

  it('shows "No amenities listed" for empty amenities', async () => {
    await openDetails('prospect-park', (data) => {
      data.find((p) => p.id === 'prospect-park').amenities = []
    })
    expect(screen.getByRole('heading', { level: 2, name: 'Amenities' })).toBeInTheDocument()
    expect(screen.getByText('No amenities listed')).toHaveClass('italic', 'text-muted')
    expect(screen.queryByRole('list', { name: 'Amenities' })).toBeNull()
  })

  it('hides the OSM link for a park without coordinates', async () => {
    await openDetails('prospect-park', (data) => {
      delete data.find((p) => p.id === 'prospect-park').location.lat
    })
    expect(screen.queryByRole('link', { name: /^Open in OpenStreetMap/ })).toBeNull()
  })

  it('humanizes amenity tokens instead of dropping them', async () => {
    await openDetails('central-plaza-green')
    expect(amenityLabels()).toContain('Wifi')
  })

  it('humanizes dog-run as "Dog run"', async () => {
    await openDetails('highland-dog-park')
    expect(amenityLabels()).toContain('Dog run')
  })

  it('renders every sample park without null/undefined/NaN and with one h1', async () => {
    for (const raw of sample) {
      stubData()
      const { unmount } = renderAt(`/parks/${raw.id}`)
      await screen.findByRole('article')
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent(raw.name)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(screen.getByRole('article').textContent).not.toMatch(/null|undefined|NaN/)
      unmount()
    }
  })

  it('keyboard only: Tab to a card, Enter, heading focused, "All parks" returns focus to the card', async () => {
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    const target = within(cardFor('Old Mill Botanical Garden')).getByRole('link')
    for (let i = 0; i < 20 && document.activeElement !== target; i++) {
      await user.tab()
    }
    expect(target).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Old Mill Botanical Garden' }),
    ).toHaveFocus()

    await user.tab({ shift: true })
    expect(within(asideRegion()).getByRole('link', { name: 'All parks' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await findCards()
    expect(document.activeElement).toBe(
      within(cardFor('Old Mill Botanical Garden')).getByRole('link'),
    )
  })

  it('"All parks" returns to the list with focus on that park\'s card', async () => {
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    await user.click(within(cardFor('Old Mill Botanical Garden')).getByRole('link'))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Old Mill Botanical Garden' }),
    ).toHaveFocus()

    await user.tab({ shift: true })
    expect(
      within(screen.getByRole('complementary', { name: 'Parks' })).getByRole('link', {
        name: 'All parks',
      }),
    ).toHaveFocus()
    await user.keyboard('{Enter}')
    await findCards()
    expect(document.activeElement).toBe(
      within(cardFor('Old Mill Botanical Garden')).getByRole('link'),
    )
  })
})

// jsdom has no matchMedia: stub it per test. `set` simulates a viewport change.
function stubViewport(desktop) {
  const listeners = new Set()
  const mql = {
    matches: desktop,
    media: '(min-width: 768px)',
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
  }
  window.matchMedia = vi.fn(() => mql)
  return {
    set(value) {
      mql.matches = value
      act(() => listeners.forEach((fn) => fn()))
    },
  }
}

afterEach(() => {
  delete window.matchMedia
})

function LocationDisplay() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderWithLocation(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationDisplay />
      <App />
    </MemoryRouter>,
  )
}

function mapRegion() {
  return screen.getByRole('region', { name: 'Map of parks' })
}

const MARKER_NAME = /^\d+\. /

function markerNamed(name) {
  return within(mapRegion()).getByRole('button', { name: new RegExp(`^\\d+\\. ${name}$`) })
}

function findMarkerByName(name) {
  return within(mapRegion()).findByRole('button', { name: new RegExp(`^\\d+\\. ${name}$`) })
}

describe('Map of parks', () => {
  it('renders 12 marker buttons named "1. …" to "12. …", none amber, at /', async () => {
    stubData()
    renderAt('/')
    const buttons = await within(mapRegion()).findAllByRole('button', { name: MARKER_NAME })
    expect(buttons).toHaveLength(12)
    buttons.forEach((button, i) =>
      expect(button).toHaveAccessibleName(`${i + 1}. ${SORTED_NAMES[i]}`),
    )
    buttons.forEach((button) => expect(button).not.toHaveClass('bg-amber'))
    expect(within(mapRegion()).getByRole('link', { name: 'OpenStreetMap' })).toBeInTheDocument()
  })

  it('highlights the park on /parks/:id in amber, larger; the rest stay forest', async () => {
    stubData()
    renderAt('/parks/prospect-park')
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    const selected = markerNamed('Prospect Park')
    expect(selected).toHaveClass('bg-amber', 'size-14')
    const others = within(mapRegion())
      .getAllByRole('button', { name: MARKER_NAME })
      .filter((b) => b !== selected)
    expect(others).toHaveLength(11)
    others.forEach((b) => expect(b).toHaveClass('bg-forest'))
  })

  it('gives a park without coordinates no marker but keeps it in the list', async () => {
    stubData((data) => {
      delete data.find((p) => p.id === 'highland-dog-park').location.lng
    })
    renderAt('/')
    await findCards()
    expect(within(mapRegion()).getAllByRole('button', { name: MARKER_NAME })).toHaveLength(11)
    expect(within(mapRegion()).queryByRole('button', { name: /Highland Dog Park/ })).toBeNull()
    expect(cardFor('Highland Dog Park')).toBeInTheDocument()
  })

  it.each([
    ['loading', () => vi.fn(() => new Promise(() => {}))],
    ['error', () => vi.fn().mockResolvedValue({ ok: false, status: 500 })],
  ])('shows no map while %s', async (state, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch())
    const { container } = renderAt('/')
    if (state === 'error') await screen.findByText(ERROR_TEXT)
    else expect(screen.getByText('Loading parks…')).toBeInTheDocument()
    expect(container.querySelector('.leaflet-container')).toBeNull()
    expect(within(mapRegion()).queryAllByRole('button')).toHaveLength(0)
  })

  it('reaches every marker with Tab, once each, in order', async () => {
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    const buttons = await within(mapRegion()).findAllByRole('button', { name: MARKER_NAME })
    const reached = []
    for (let i = 0; i < 60 && reached.length < buttons.length; i++) {
      await user.tab()
      if (buttons.includes(document.activeElement)) reached.push(document.activeElement)
    }
    expect(reached).toEqual(buttons)
    buttons.forEach((b) => expect(b).toHaveClass('focus-ring'))
  })

  it('never calls navigator.geolocation', async () => {
    const geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    }
    vi.stubGlobal('navigator', { ...navigator, geolocation })
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await findMarkerByName('Prospect Park'))
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(geolocation.watchPosition).not.toHaveBeenCalled()
  })
})

describe('Map on desktop (≥ 768px)', () => {
  it('navigates to /parks/:id when a marker is clicked', async () => {
    stubViewport(true)
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    await user.click(await findMarkerByName('Prospect Park'))
    const aside = screen.getByRole('complementary', { name: 'Parks' })
    expect(
      await within(aside).findByRole('heading', { level: 1, name: 'Prospect Park' }),
    ).toHaveFocus()
    expect(screen.getByTestId('location')).toHaveTextContent('/parks/prospect-park')
    expect(markerNamed('Prospect Park')).toHaveClass('bg-amber')
    expect(screen.queryByRole('button', { name: 'Close park preview' })).toBeNull()
  })

  it('navigates to /parks/:id on Enter on a focused marker', async () => {
    stubViewport(true)
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    const marker = await findMarkerByName('Highland Dog Park')
    marker.focus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Highland Dog Park' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/parks/highland-dog-park')
  })

  it('does not push a duplicate history entry for the already-selected marker', async () => {
    stubViewport(true)
    stubData()
    const user = userEvent.setup()

    function BackButton() {
      const navigate = useNavigate()
      return (
        <button type="button" onClick={() => navigate(-1)}>
          back
        </button>
      )
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <LocationDisplay />
        <BackButton />
        <App />
      </MemoryRouter>,
    )
    await user.click(await findMarkerByName('Prospect Park'))
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    // Two clicks within 200 ms make Leaflet synthesize a map dblclick, which
    // jsdom's zero-size layout turns into a NaN LatLng. Move the clock past it.
    const later = Date.now() + 1000
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later)
    try {
      await user.click(markerNamed('Prospect Park'))
    } finally {
      clock.mockRestore()
    }
    expect(screen.getByTestId('location')).toHaveTextContent('/parks/prospect-park')

    await user.click(screen.getByRole('button', { name: 'back' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'All parks' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  })

  it('moves from a park with a failed image straight to another park via its marker', async () => {
    stubViewport(true)
    stubData()
    const user = userEvent.setup()
    renderAt('/parks/prospect-park')
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    fireEvent.error(screen.getByRole('img', { name: 'Photo of Prospect Park' }))
    expect(screen.getByText('No photos for this park yet')).toBeInTheDocument()

    await user.click(markerNamed('Lakeshore Point'))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Lakeshore Point' })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('img', { name: 'Photo of Lakeshore Point' })).toBeInTheDocument()
    expect(screen.queryByText('No photos for this park yet')).toBeNull()
    expect(markerNamed('Lakeshore Point')).toHaveClass('bg-amber')
    expect(markerNamed('Prospect Park')).not.toHaveClass('bg-amber')
  })

  it('treats a missing matchMedia as desktop', async () => {
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    await user.click(await findMarkerByName('Lakeshore Point'))
    expect(screen.getByTestId('location')).toHaveTextContent('/parks/lakeshore-point')
  })
})

describe('Map on phone (< 768px)', () => {
  it('opens a preview for marker 8 without changing the URL', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    await user.click(await findMarkerByName('Prospect Park'))

    const preview = screen.getByRole('region', { name: 'Prospect Park' })
    expect(within(preview).getByText('Park 8 of 12')).toBeInTheDocument()
    expect(
      within(preview).getByRole('heading', { level: 2, name: 'Prospect Park' }),
    ).toBeInTheDocument()
    expect(within(preview).getByText('Brooklyn, NY 11225')).toBeInTheDocument()
    expect(within(preview).getByText('6:00 AM - 1:00 AM')).toBeInTheDocument()
    expect(within(preview).getByRole('link', { name: 'View park details' })).toHaveAttribute(
      'href',
      '/parks/prospect-park',
    )
    expect(
      within(preview).getByRole('button', { name: 'Close park preview' }),
    ).toBeInTheDocument()
    expect(preview).toHaveFocus()

    expect(markerNamed('Prospect Park')).toHaveClass('bg-amber')
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    expect(screen.getByRole('heading', { level: 1, name: 'All parks' })).toBeInTheDocument()
  })

  it('gives the preview controls 44px targets and a focus ring', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await findMarkerByName('Prospect Park'))
    expect(screen.getByRole('button', { name: 'Close park preview' })).toHaveClass(
      'focus-ring',
      'size-11',
    )
    expect(screen.getByRole('link', { name: 'View park details' })).toHaveClass(
      'focus-ring',
      'min-h-11',
    )
  })

  it('shows "Address not listed" (muted) for Highland Dog Park', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await findMarkerByName('Highland Dog Park'))
    const preview = screen.getByRole('region', { name: 'Highland Dog Park' })
    expect(within(preview).getByText('Address not listed')).toHaveClass('text-muted')
    expect(within(preview).getByText('Park 4 of 12')).toBeInTheDocument()
  })

  it('shows "Hours not listed" for missing hours', async () => {
    stubViewport(false)
    stubData((data) => {
      delete data.find((p) => p.id === 'prospect-park').hours
    })
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await findMarkerByName('Prospect Park'))
    const preview = screen.getByRole('region', { name: 'Prospect Park' })
    expect(within(preview).getByText('Hours not listed')).toHaveClass('text-muted')
  })

  it('"View park details" navigates to /parks/:id and closes the preview', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    await user.click(await findMarkerByName('Prospect Park'))
    await user.click(screen.getByRole('link', { name: 'View park details' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Prospect Park' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/parks/prospect-park')
    expect(screen.queryByRole('button', { name: 'Close park preview' })).toBeNull()
  })

  it('"Close park preview" removes the preview and returns focus to the marker', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await findMarkerByName('Prospect Park'))
    await user.click(screen.getByRole('button', { name: 'Close park preview' }))
    expect(screen.queryByRole('region', { name: 'Prospect Park' })).toBeNull()
    const marker = markerNamed('Prospect Park')
    expect(marker).toHaveFocus()
    expect(marker).not.toHaveClass('bg-amber')
  })

  it('closes the preview on Escape and returns focus to the marker', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await findMarkerByName('Prospect Park'))
    expect(screen.getByRole('region', { name: 'Prospect Park' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Prospect Park' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Close park preview' })).toBeNull()
    expect(within(mapRegion()).getByRole('button', { name: '8. Prospect Park' })).toHaveFocus()
  })

  it('clears the preview when the viewport becomes desktop', async () => {
    const viewport = stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    await user.click(await findMarkerByName('Prospect Park'))
    expect(screen.getByRole('button', { name: 'Close park preview' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Prospect Park' })).toHaveFocus()
    viewport.set(true)
    expect(screen.queryByRole('button', { name: 'Close park preview' })).toBeNull()
    expect(markerNamed('Prospect Park')).not.toHaveClass('bg-amber')
    expect(markerNamed('Prospect Park')).toHaveFocus()
    viewport.set(false)
    expect(screen.queryByRole('button', { name: 'Close park preview' })).toBeNull()
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  })
})

// ---- Story 1.5: responsive shell ----

function asideRegion() {
  return screen.getByRole('complementary', { name: 'Parks' })
}

function headerBackLink() {
  return within(screen.getByRole('banner')).getByRole('link', { name: 'All parks' })
}

function renderWithBack(path) {
  function BackButton() {
    const navigate = useNavigate()
    return (
      <button type="button" onClick={() => navigate(-1)}>
        history back
      </button>
    )
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationDisplay />
      <BackButton />
      <App />
    </MemoryRouter>,
  )
}

describe('Phone List / Map toggle', () => {
  it('defaults to List: List pressed, Map not, map pane hidden', async () => {
    stubViewport(false)
    stubData()
    renderAt('/')
    await findCards()
    const group = screen.getByRole('group', { name: 'View' })
    expect(group).toHaveClass('md:hidden')
    const list = within(group).getByRole('button', { name: 'List' })
    const map = within(group).getByRole('button', { name: 'Map' })
    for (const button of [list, map]) {
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveClass('focus-ring', 'min-h-11')
    }
    expect(list).toHaveAttribute('aria-pressed', 'true')
    expect(map).toHaveAttribute('aria-pressed', 'false')
    expect(asideRegion()).not.toHaveClass('hidden')
    expect(mapRegion()).toHaveClass('hidden', 'md:block')
  })

  it('pressing Map shows the map pane and hides the list pane', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    await user.click(screen.getByRole('button', { name: 'Map' }))
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false')
    expect(asideRegion()).toHaveClass('hidden', 'md:block')
    expect(mapRegion()).not.toHaveClass('hidden')
  })

  it('switching back to List closes an open preview', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    await user.click(screen.getByRole('button', { name: 'Map' }))
    await user.click(markerNamed('Prospect Park'))
    expect(screen.getByRole('region', { name: 'Prospect Park' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.queryByRole('region', { name: 'Prospect Park' })).toBeNull()
    expect(markerNamed('Prospect Park')).not.toHaveClass('bg-amber')
    expect(mapRegion()).toHaveClass('hidden')
  })

  it('has no toggle and hides the map on details', async () => {
    stubViewport(false)
    await openDetails('prospect-park')
    expect(screen.queryByRole('group', { name: 'View' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'List' })).toBeNull()
    expect(mapRegion()).toHaveClass('hidden', 'md:block')
    expect(asideRegion()).not.toHaveClass('hidden')
  })

  it('keeps both panes and the map visible on desktop', async () => {
    stubViewport(true)
    stubData()
    renderAt('/')
    await findCards()
    expect(asideRegion()).toHaveClass('md:w-[400px]', 'md:overflow-y-auto')
    expect(asideRegion()).not.toHaveClass('hidden')
    // The toggle is CSS-hidden at desktop width.
    expect(screen.getByRole('group', { name: 'View' })).toHaveClass('md:hidden')
  })
})

describe('Toggle outside the ready state', () => {
  it.each([
    ['loading', () => vi.fn(() => new Promise(() => {}))],
    ['error', () => vi.fn().mockResolvedValue({ ok: false, status: 500 })],
  ])('is absent while %s, and the aside stays visible', async (state, makeFetch) => {
    stubViewport(false)
    vi.stubGlobal('fetch', makeFetch())
    renderAt('/')
    if (state === 'error') await screen.findByText(ERROR_TEXT)
    else expect(screen.getByText('Loading parks…')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'View' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Map' })).toBeNull()
    expect(asideRegion()).not.toHaveClass('hidden')
  })
})

describe('Resize from the phone Map tab to desktop', () => {
  it('shows both panes and returns focus to the card from details', async () => {
    const viewport = stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    await user.click(screen.getByRole('button', { name: 'Map' }))
    viewport.set(true)
    // On desktop the stale Map tab is ignored by behaviour; CSS shows both panes (md:block).
    expect(mapRegion()).not.toHaveClass('hidden')
    expect(asideRegion()).toHaveClass('md:block')
    await user.click(within(cardFor('Riverside Commons')).getByRole('link'))
    await screen.findByRole('heading', { level: 1, name: 'Riverside Commons' })
    expect(asideRegion()).not.toHaveClass('hidden')
    await user.click(within(asideRegion()).getByRole('link', { name: 'All parks' }))
    await findCards()
    expect(document.activeElement).toBe(within(cardFor('Riverside Commons')).getByRole('link'))
  })
})

describe('Header', () => {
  it('shows the app name and park count on the list', async () => {
    stubData()
    renderAt('/')
    await findCards()
    const header = screen.getByRole('banner')
    expect(within(header).getByText('Find a Park')).toBeInTheDocument()
    expect(within(header).getByText('Parks in the New York City area')).toBeInTheDocument()
    expect(within(header).getByText('12 parks')).toBeInTheDocument()
    expect(within(header).getByText('12 parks · New York City area')).toBeInTheDocument()
    expect(within(header).queryByRole('link')).toBeNull()
    expect(within(header).queryByRole('heading')).toBeNull()
    expect(within(header).getByText('Find a Park').closest('div.flex-wrap')).not.toHaveClass('hidden')
  })

  it('shows a phone-only "All parks" link on details', async () => {
    await openDetails('prospect-park')
    const link = headerBackLink()
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveClass('focus-ring', 'min-h-11')
    expect(link.parentElement).toHaveClass('md:hidden')
    // The app name and subtitle are phone-hidden on details, shown again at desktop width.
    const nameBlock = within(screen.getByRole('banner')).getByText('Find a Park').closest('div.flex-wrap')
    expect(nameBlock).toHaveClass('hidden', 'md:flex')
    // The sidebar's bordered back link is desktop-only.
    const sidebarLink = within(asideRegion()).getByRole('link', { name: 'All parks' })
    expect(sidebarLink).toHaveClass('hidden', 'md:inline-flex')
  })

  it('the header "All parks" link returns focus to the card', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    await user.click(within(cardFor('Lakeshore Point')).getByRole('link'))
    await screen.findByRole('heading', { level: 1, name: 'Lakeshore Point' })
    await user.click(headerBackLink())
    await findCards()
    expect(document.activeElement).toBe(within(cardFor('Lakeshore Point')).getByRole('link'))
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('One h1 per view', () => {
  const expectOneH1 = (name) => {
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(name)
  }

  it('loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt('/')
    expect(screen.getByText('Loading parks…')).toBeInTheDocument()
    expectOneH1('All parks')
  })

  it('error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    renderAt('/')
    await screen.findByText(ERROR_TEXT)
    expectOneH1('All parks')
  })

  it('list', async () => {
    stubData()
    renderAt('/')
    await findCards()
    expectOneH1('All parks')
  })

  it('details', async () => {
    await openDetails('highland-dog-park')
    expectOneH1('Highland Dog Park')
  })

  it('phone Map tab: a visually hidden "Map of parks" h1; the list h1 is in the hidden aside', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    expect(within(mapRegion()).queryByRole('heading', { level: 1 })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Map' }))
    const mapHeading = within(mapRegion()).getByRole('heading', { level: 1, name: 'Map of parks' })
    expect(mapHeading).toHaveClass('sr-only', 'md:hidden')
    // jsdom applies no CSS: the list h1 is still in the DOM, inside the display:none aside.
    expect(asideRegion()).toHaveClass('hidden')
    expect(screen.getAllByRole('heading', { level: 1 }).filter((h) => !asideRegion().contains(h))).toEqual([
      mapHeading,
    ])
    await user.click(screen.getByRole('button', { name: 'List' }))
    expectOneH1('All parks')
  })

  it.each(['/parks/nope', '/foo'])('not found at %s', async (path) => {
    stubData()
    renderAt(path)
    await screen.findByRole('heading', { name: 'Park not found' })
    expectOneH1('Park not found')
  })
})

describe('document.title', () => {
  it('is "Find a Park" on the list and "{name} · Find a Park" on details', async () => {
    stubData()
    const user = userEvent.setup()
    renderAt('/')
    await findCards()
    expect(document.title).toBe('Find a Park')
    await user.click(within(cardFor('Prospect Park')).getByRole('link'))
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    expect(document.title).toBe('Prospect Park · Find a Park')
    await user.click(within(asideRegion()).getByRole('link', { name: 'All parks' }))
    await findCards()
    expect(document.title).toBe('Find a Park')
  })
})

describe('Phone Back from details', () => {
  async function openFromMap(user) {
    await findCards()
    await user.click(screen.getByRole('button', { name: 'Map' }))
    await user.click(markerNamed('Prospect Park'))
    await user.click(screen.getByRole('link', { name: 'View park details' }))
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    expect(mapRegion()).toHaveClass('hidden')
  }

  function expectMapTabWithMarkerFocus() {
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true')
    expect(mapRegion()).not.toHaveClass('hidden')
    expect(asideRegion()).toHaveClass('hidden')
    expect(markerNamed('Prospect Park')).toHaveFocus()
  }

  it('via the header link returns to the Map tab with focus on the marker', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderWithLocation('/')
    await openFromMap(user)
    await user.click(headerBackLink())
    await findCards()
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
    expectMapTabWithMarkerFocus()
  })

  it('via browser Back returns to the Map tab with focus on the marker', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderWithBack('/')
    await openFromMap(user)
    await user.click(screen.getByRole('button', { name: 'history back' }))
    await findCards()
    expectMapTabWithMarkerFocus()
    // The id was consumed: no card takes focus later.
    await user.click(screen.getByRole('button', { name: 'List' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'List' }))
  })

  it('from list-opened details returns to the List tab with focus on the card', async () => {
    stubViewport(false)
    stubData()
    const user = userEvent.setup()
    renderWithBack('/')
    await findCards()
    await user.click(within(cardFor('Prospect Park')).getByRole('link'))
    await screen.findByRole('heading', { level: 1, name: 'Prospect Park' })
    await user.click(screen.getByRole('button', { name: 'history back' }))
    await findCards()
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
    expect(mapRegion()).toHaveClass('hidden')
    expect(document.activeElement).toBe(within(cardFor('Prospect Park')).getByRole('link'))
  })
})

describe('No clickable div or span', () => {
  it('no div/span in the app source has an onClick', () => {
    const files = [
      'src/App.jsx',
      'src/components/ParkList.jsx',
      'src/components/ParkDetails.jsx',
      'src/components/ParkMap.jsx',
      'src/components/ParkPreview.jsx',
    ]
    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source, file).not.toMatch(/<(div|span)\b[^>]*\bonClick=/)
    }
  })
})
