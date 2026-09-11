import { describe, expect, it } from 'vitest'
import { caribbeanI18n } from '../data/caribbean.i18n'
import { makeDatasetI18n } from './dataset'

describe('makeDatasetI18n', () => {
  it('falls back to the raw value when no sidecar / no locale entry', () => {
    const d = makeDatasetI18n(undefined, 'en')
    expect(d.value('Jamaïque')).toBe('Jamaïque')
    expect(d.label('pib')).toBe('pib')
    expect(d.unit('Mds $')).toBe('Mds $')
  })

  it('translates values, labels and units for a locale', () => {
    const en = makeDatasetI18n(caribbeanI18n, 'en')
    expect(en.value('Jamaïque')).toBe('Jamaica')
    expect(en.value('La Havane')).toBe('Havana')
    expect(en.label('pib')).toBe('GDP')
    expect(en.unit('Mds $')).toBe('bn $')
  })

  it('applies the French label corrections', () => {
    const fr = makeDatasetI18n(caribbeanI18n, 'fr')
    expect(fr.label('pib')).toBe('PIB')
    expect(fr.label('densite')).toBe('densité')
  })

  it('resolves the article per locale (CSV article is French-only)', () => {
    const fr = makeDatasetI18n(caribbeanI18n, 'fr')
    const en = makeDatasetI18n(caribbeanI18n, 'en')
    // « le » vient de la colonne CSV → seulement en français
    expect(fr.ofSubject('Nicaragua', 'le')).toBe('du Nicaragua')
    expect(en.ofSubject('Nicaragua', 'le')).toBe('of Nicaragua')
    // override du sidecar
    expect(en.ofSubject('Bahamas', 'les')).toBe('of the Bahamas')
    expect(en.subject('Bahamas', 'les')).toBe('the Bahamas')
  })
})
