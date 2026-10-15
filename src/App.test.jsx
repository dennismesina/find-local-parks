import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router'
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
    expect(await within(aside).findByRole('heading', { name: 'All parks' })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { level: 1, name: 'All parks' })).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'All parks' })).toBeInTheDocument()
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
    await user.tab()
    expect(document.activeElement).toHaveAttribute('href', '/parks/cedar-hill-nature-preserve')
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cedar Hill Nature Preserve' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).toBeNull()
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
