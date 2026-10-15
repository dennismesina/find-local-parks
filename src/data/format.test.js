import { describe, expect, it } from 'vitest'
import { amenityLabel } from './format.js'

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
