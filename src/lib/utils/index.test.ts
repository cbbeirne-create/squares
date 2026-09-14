import { describe, expect, it } from 'vitest'
import { gridRef, parseGridRef, percentSold, slugify, validateEmail, validateFanName, validateMessage } from './index'

describe('public input validation', () => {
  it('validates names and email addresses', () => {
    expect(validateFanName('Seán Murphy')).toBeNull()
    expect(validateFanName(' ')).toBeTruthy()
    expect(validateEmail('supporter@example.ie')).toBeNull()
    expect(validateEmail('not-an-email')).toBeTruthy()
  })

  it('limits and moderates messages', () => {
    expect(validateMessage('A treasured club memory')).toBeNull()
    expect(validateMessage('x'.repeat(161))).toBeTruthy()
    expect(validateMessage('this is shit')).toBeTruthy()
  })
})

describe('grid helpers', () => {
  it('round-trips display references', () => {
    expect(gridRef(11, 3)).toBe('R4–C12')
    expect(parseGridRef('R4–C12')).toEqual({ x: 11, y: 3 })
  })

  it('handles empty campaigns', () => {
    expect(percentSold(10, 20)).toBe(50)
    expect(percentSold(0, 0)).toBe(0)
  })
})

describe('slugify', () => {
  it('creates stable slugs', () => {
    expect(slugify('Roscommon GAA Club')).toBe('roscommon-gaa-club')
  })
})
