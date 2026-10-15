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
