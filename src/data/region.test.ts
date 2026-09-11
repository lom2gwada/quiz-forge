import { describe, expect, it } from 'vitest'
import caribbeanCsv from './caribbean.csv?raw'
import { parseCsv } from '../utils/quizGenerator'
import { region, REGION_VIEWBOX } from './region'

const territoryNames = parseCsv(caribbeanCsv).map((row) => row.pays)

describe('region (carte composite)', () => {
  it('covers every territory of the bundled dataset', () => {
    for (const name of territoryNames) expect(region, name).toHaveProperty(name)
  })

  it('gives every entry a centroid inside the shared viewBox', () => {
    const [, , w, h] = REGION_VIEWBOX.split(' ').map(Number)
    for (const [name, shape] of Object.entries(region)) {
      expect(shape.cx, name).toBeGreaterThanOrEqual(0)
      expect(shape.cx, name).toBeLessThanOrEqual(w)
      expect(shape.cy, name).toBeGreaterThanOrEqual(0)
      expect(shape.cy, name).toBeLessThanOrEqual(h)
    }
  })

  it('only draws a shape when it is not dot-only, and vice versa', () => {
    for (const [name, shape] of Object.entries(region)) {
      if (shape.dotOnly) expect(shape.d, name).toBe('')
      else expect(shape.d, name).toMatch(/^M/)
    }
  })

  it('flags the smallest territories as dot-only, keeps the large ones as shapes', () => {
    expect(region['Cuba'].dotOnly).toBe(false)
    expect(region['Mexique'].dotOnly).toBe(false)
    expect(region['Saint-Barthélemy'].dotOnly).toBe(true)
    expect(region['Sint Maarten'].dotOnly).toBe(true)
  })
})
