import { describe, expect, it } from 'vitest'
import { amenityLabel, display, formatAcres, formatRating, osmUrl } from './format.js'

describe('formatRating', () => {
  it('shows one decimal out of 5', () => {
    expect(formatRating(4.7)).toBe('4.7 / 5')
    expect(formatRating(4)).toBe('4.0 / 5')
    expect(formatRating(0)).toBe('0.0 / 5')
  })

  it('returns null for a missing or invalid rating', () => {
    expect(formatRating(null)).toBeNull()
    expect(formatRating(undefined)).toBeNull()
    expect(formatRating(NaN)).toBeNull()
    expect(formatRating('4.5')).toBeNull()
  })
})

describe('formatAcres', () => {
  it('pluralizes acres', () => {
    expect(formatAcres(526)).toBe('526 acres')
    expect(formatAcres(1)).toBe('1 acre')
    expect(formatAcres(0.5)).toBe('0.5 acres')
  })

  it('returns null for a missing or invalid acreage', () => {
    expect(formatAcres(null)).toBeNull()
    expect(formatAcres(undefined)).toBeNull()
    expect(formatAcres(Infinity)).toBeNull()
  })
})

describe('osmUrl', () => {
  it('builds the OpenStreetMap link from lat/lng', () => {
    expect(osmUrl(40.6602, -73.969)).toBe(
      'https://www.openstreetmap.org/?mlat=40.6602&mlon=-73.969#map=16/40.6602/-73.969',
    )
  })
})

describe('display', () => {
  it('passes a present value through as text', () => {
    expect(display('Dawn to dusk', 'Not listed')).toEqual({ text: 'Dawn to dusk', missing: false })
    expect(display(0, 'Not listed')).toEqual({ text: '0', missing: false })
  })

  it('uses the fallback for null, undefined, blank text and NaN', () => {
    for (const value of [null, undefined, '', '   ', NaN]) {
      expect(display(value, 'Not listed')).toEqual({ text: 'Not listed', missing: true })
    }
  })
})

describe('amenityLabel', () => {
  it('replaces dashes with spaces and capitalizes the first letter', () => {
    expect(amenityLabel('dog-run')).toBe('Dog run')
    expect(amenityLabel('wildlife-viewing')).toBe('Wildlife viewing')
  })

  it('capitalizes single-word tokens', () => {
    expect(amenityLabel('wifi')).toBe('Wifi')
  })

  it('humanizes unknown tokens instead of dropping them', () => {
    expect(amenityLabel('zip-line-tower')).toBe('Zip line tower')
  })

  it('keeps the rest of the token as written', () => {
    expect(amenityLabel('BBQ-pits')).toBe('BBQ pits')
  })

  it('trims surrounding whitespace before transforming', () => {
    expect(amenityLabel(' dog-run ')).toBe('Dog run')
  })
})
