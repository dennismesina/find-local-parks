import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadParks, normalizePark, normalizeParks, resolveImageUrl } from './parks.js'

const sample = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/parks.sample.json'), 'utf8'),
)

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

const byId = (parks, id) => parks.find((p) => p.id === id)

describe('normalizeParks', () => {
  it('keeps all 12 sample parks, sorted A–Z and numbered 1–12', () => {
    const parks = normalizeParks(sample)
    const names = parks.map((p) => p.name)
    expect(parks).toHaveLength(12)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    expect(parks.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(parks[0].name).toBe('Cedar Hill Nature Preserve')
    expect(parks[11].name).toBe('Willow Creek Wetlands')
  })

  it('returns the normalized shape', () => {
    const prospect = byId(normalizeParks(sample), 'prospect-park')
    expect(Object.keys(prospect).sort()).toEqual(
      [
        'id', 'name', 'number', 'description', 'address', 'lat', 'lng',
        'hasCoords', 'amenities', 'hours', 'images', 'acreage', 'rating',
      ].sort(),
    )
    expect(prospect).toMatchObject({
      address: 'Brooklyn, NY 11225',
      lat: 40.6602,
      lng: -73.969,
      hasCoords: true,
      hours: '6:00 AM - 1:00 AM',
      acreage: 526,
      rating: 4.7,
    })
  })

  it('sets a missing nested address to null without throwing (Highland)', () => {
    const highland = byId(normalizeParks(sample), 'highland-dog-park')
    expect(highland.address).toBeNull()
    expect(highland.hasCoords).toBe(true)
  })

  it('keeps null and empty fields as null / [] without inventing defaults', () => {
    const parks = normalizeParks(sample)
    expect(byId(parks, 'old-mill-botanical-garden').description).toBeNull()
    const cedar = byId(parks, 'cedar-hill-nature-preserve')
    expect(cedar.images).toEqual([])
    expect(cedar.rating).toBeNull()
    expect(byId(parks, 'east-ridge-trailhead').images).toEqual([])
  })

  it('does not mutate the parsed source', () => {
    const source = structuredClone(sample)
    const snapshot = structuredClone(source)
    deepFreeze(source)
    expect(() => normalizeParks(source)).not.toThrow()
    expect(source).toEqual(snapshot)
    expect(source[0].images[0]).toBe('https://images.example.com/prospect-1.jpg')
  })

  it('sorts parks without a name last, without throwing', () => {
    const parks = normalizeParks([
      { id: 'b', name: 'B' },
      { id: 'n' },
      { id: 'a', name: 'A' },
      { id: 'w', name: '  ' },
    ])
    expect(parks.map((p) => p.name)).toEqual(['A', 'B', null, null])
    expect(parks.map((p) => p.number)).toEqual([1, 2, 3, 4])
  })

  it('returns [] for a non-array input and skips non-object entries', () => {
    expect(normalizeParks(null)).toEqual([])
    expect(normalizeParks([null, 'x', { id: 'a', name: 'A' }])).toHaveLength(1)
  })
})

describe('normalizePark', () => {
  it('uses [] for missing amenities and images', () => {
    const park = normalizePark({ id: 'x', name: 'X' })
    expect(park.amenities).toEqual([])
    expect(park.images).toEqual([])
  })

  it('uses null for missing scalars and a missing location', () => {
    expect(normalizePark({ id: 'x', name: 'X' })).toMatchObject({
      description: null,
      address: null,
      lat: null,
      lng: null,
      hasCoords: false,
      hours: null,
      acreage: null,
      rating: null,
    })
  })

  it.each([
    ['missing lat', { lng: -73.9 }],
    ['missing lng', { lat: 40.7 }],
    ['NaN lat', { lat: NaN, lng: -73.9 }],
    ['Infinity lng', { lat: 40.7, lng: Infinity }],
    ['string coords', { lat: '40.7', lng: '-73.9' }],
    ['null location', null],
    ['out-of-range lat', { lat: 200, lng: -73.9 }],
    ['out-of-range lng', { lat: 40.7, lng: -181 }],
  ])('flags bad coordinates (%s) with hasCoords: false and keeps the park', (_label, location) => {
    const parks = normalizeParks([{ id: 'x', name: 'X', location }])
    expect(parks).toHaveLength(1)
    expect(parks[0].hasCoords).toBe(false)
  })

  it('nulls blank strings, trims padded text, filters amenities and rejects negative acreage', () => {
    const park = normalizePark({
      id: 'x',
      name: '  Prospect Park  ',
      description: '   ',
      hours: '',
      amenities: ['trails', '', 3, null],
      acreage: -5,
    })
    expect(park.name).toBe('Prospect Park')
    expect(park.description).toBeNull()
    expect(park.hours).toBeNull()
    expect(park.amenities).toEqual(['trails'])
    expect(park.acreage).toBeNull()
  })

  it('keeps rating null when it is not a finite number in 0–5', () => {
    expect(normalizePark({ id: 'x', name: 'X', rating: 7 }).rating).toBeNull()
    expect(normalizePark({ id: 'x', name: 'X', rating: -1 }).rating).toBeNull()
    expect(normalizePark({ id: 'x', name: 'X', rating: '4' }).rating).toBeNull()
    expect(normalizePark({ id: 'x', name: 'X', rating: 0 }).rating).toBe(0)
  })
})

describe('resolveImageUrl', () => {
  it('maps a sample URL to the bundled png with the same stem', () => {
    const url = resolveImageUrl('https://images.example.com/prospect-1.jpg')
    expect(url).toMatch(/prospect-1\.png$/)
    expect(url).not.toContain('images.example.com')
  })

  it('maps every sample image URL', () => {
    for (const park of normalizeParks(sample)) {
      for (const url of park.images) expect(url).toMatch(/\.png$/)
    }
  })

  it('passes an unmatched URL through unchanged', () => {
    expect(resolveImageUrl('https://x.test/zzz.jpg')).toBe('https://x.test/zzz.jpg')
  })
})

describe('loadParks', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the public JSON and returns normalized parks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sample })
    vi.stubGlobal('fetch', fetchMock)
    const parks = await loadParks()
    expect(fetchMock).toHaveBeenCalledWith('/data/parks.sample.json')
    expect(parks).toHaveLength(12)
  })

  it('throws on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(loadParks()).rejects.toThrow()
  })

  it('throws when the payload is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    await expect(loadParks()).rejects.toThrow()
  })

  it('throws when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
    await expect(loadParks()).rejects.toThrow()
  })
})
