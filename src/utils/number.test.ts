import { describe, expect, it } from 'vitest'
import { formatNumber, formatNumericValue } from './number'

const spaces = (s: string) => s.replace(/[\s  ]/g, ' ')

describe('formatNumber', () => {
  it('sépare les milliers', () => {
    expect(spaces(formatNumber(11190000))).toBe('11 190 000')
    expect(spaces(formatNumber(5130))).toBe('5 130')
  })
  it('laisse les nombres < 1000 intacts', () => {
    expect(formatNumber(430)).toBe('430')
    expect(formatNumber(0)).toBe('0')
  })
  it('renvoie une chaîne pour les valeurs non finies', () => {
    expect(formatNumber(NaN)).toBe('NaN')
  })
})

describe('formatNumericValue', () => {
  it('sépare une population', () => {
    expect(spaces(formatNumericValue(11190000, false))).toBe('11 190 000')
  })
  it('laisse une année brute', () => {
    expect(formatNumericValue(1804, true)).toBe('1804')
  })
})
