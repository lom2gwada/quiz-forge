import { describe, expect, it } from 'vitest'
import caribbeanCsv from '../data/caribbean.csv?raw'
import { caribbeanI18n } from '../data/caribbean.i18n'
import { parseQuiz } from './quizValidation'
import { generateQuiz, inferSchema, parseCsv, type Row } from './quizGenerator'

const caribbeanRows = parseCsv(caribbeanCsv)

describe('parseCsv', () => {
  it('detects the delimiter from the header line', () => {
    const semi = parseCsv('a;b;c\n1;2;3')
    expect(semi).toEqual([{ a: '1', b: '2', c: '3' }])
    const comma = parseCsv('a,b\nx,y')
    expect(comma).toEqual([{ a: 'x', b: 'y' }])
  })

  it('honours quoted fields containing the delimiter', () => {
    const rows = parseCsv('nom,ville\n"Doe, John","Paris, FR"')
    expect(rows).toEqual([{ nom: 'Doe, John', ville: 'Paris, FR' }])
  })

  it('keeps multivalue cells intact', () => {
    const [row] = parseCsv('pays;langues\nHaïti;français|créole')
    expect(row.langues).toBe('français|créole')
  })

  it('parses the bundled Caribbean dataset', () => {
    expect(caribbeanRows.length).toBeGreaterThan(20)
    expect(caribbeanRows[0]).toHaveProperty('pays')
  })
})

describe('inferSchema', () => {
  const schema = inferSchema(caribbeanRows)

  it('picks the subject column and the article column', () => {
    expect(schema.subjectColumn).toBe('pays')
    expect(schema.articleColumn).toBe('article')
    expect(schema.columns).not.toHaveProperty('article')
    expect(schema.columns).not.toHaveProperty('pays')
  })

  it('classifies column kinds', () => {
    expect(schema.columns.population.kind).toBe('number')
    expect(schema.columns.capitale.kind).toBe('string')
    expect(schema.columns.independance.isYear).toBe(true)
    expect(schema.columns.langues.multivalueSeparator).toBe('|')
    expect(schema.columns.capitale.unique).toBe(true)
  })

  it('extracts unit suffixes and detects the flag column as an image', () => {
    expect(schema.columns.superficie_km2.unit).toBe('km²')
    expect(schema.columns.superficie_km2.label).toBe('superficie')
    expect(schema.columns.drapeau.isImage).toBe(true)
    expect(schema.columns.drapeau.include).toBe(true)
  })

  it('reads the enriched columns without mis-typing phone codes as numbers', () => {
    expect(schema.columns.pib_mds_usd.kind).toBe('number')
    expect(schema.columns.pib_mds_usd.label).toBe('pib')
    expect(schema.columns.pib_mds_usd.unit).toBe('Mds $')
    expect(schema.columns.densite_hab_km2.unit).toBe('hab/km²')
    expect(schema.columns.densite_hab_km2.label).toBe('densite')
    expect(schema.columns.indicatif_telephonique.kind).toBe('string')
    expect(schema.columns.domaine_internet.kind).toBe('string')
    expect(schema.columns.domaine_internet.unique).toBe(true)
    expect(schema.columns.president.include).toBe(true)
  })

  it('honours a subject column override', () => {
    expect(inferSchema(caribbeanRows, { subjectColumn: 'capitale' }).subjectColumn).toBe('capitale')
  })
})

describe('generateQuiz', () => {
  const schema = inferSchema(caribbeanRows)
  const quiz = generateQuiz(caribbeanRows, schema, { seed: 'test' })

  it('produces a quiz that passes the app validator', () => {
    expect(() => parseQuiz(quiz)).not.toThrow()
    expect(quiz.questions.length).toBeGreaterThan(15)
  })

  it('tags single-subject questions with their subject, not group questions', () => {
    const cloze = quiz.questions.find((q) => q.question === 'Capitale de Cuba : ___')
    expect(cloze?.subject).toBe('Cuba')
    const ordering = quiz.questions.find((q) => q.type === 'ordering')
    expect(ordering?.subject).toBeUndefined()
    const matching = quiz.questions.find((q) => q.type === 'matching')
    expect(matching?.subject).toBeUndefined()
  })

  it('exposes one category per column that produced questions', () => {
    const cols = new Set(Object.entries(schema.columns).filter(([, s]) => s.include).map(([c]) => c))
    const categoryIds = new Set(quiz.categories.map((c) => c.id))
    expect(categoryIds.has('capitale')).toBe(true)
    expect(categoryIds.has('population')).toBe(true)
    expect(categoryIds.has('drapeau')).toBe(true)
    expect(categoryIds.has('pays')).toBe(false)
    // chaque question pointe vers une catégorie listée, et chaque catégorie est une colonne incluse
    for (const q of quiz.questions) expect(categoryIds.has(q.category)).toBe(true)
    for (const id of categoryIds) expect(cols.has(id)).toBe(true)
    expect(quiz.categories.find((c) => c.id === 'pib_mds_usd')?.label).toBe('Pib')
  })

  it('assigns a unique id to every question', () => {
    expect(new Set(quiz.questions.map((q) => q.id)).size).toBe(quiz.questions.length)
  })

  it('derives a content-stable id that survives a regeneration with a new seed', () => {
    const a = generateQuiz(caribbeanRows, schema, { seed: 'seed-a' })
    const b = generateQuiz(caribbeanRows, schema, { seed: 'seed-b' })
    // question mono-sujet, énoncé indépendant du tirage (pas de distracteurs dedans)
    const qa = a.questions.find((q) => q.question === 'Capitale de Cuba : ___')
    const qb = b.questions.find((q) => q.question === 'Capitale de Cuba : ___')
    expect(qa?.id).toBeDefined()
    expect(qb?.id).toBe(qa?.id)
    // le tirage change quand même l'ordre global
    expect(a.questions.map((q) => q.id)).not.toEqual(b.questions.map((q) => q.id))
  })

  it('gives every question a neutral topic label distinct from the played prompt', () => {
    const cloze = quiz.questions.find((q) => q.type === 'cloze' && q.question === 'Capitale de la Jamaïque : ___')
    expect(cloze?.topic).toBe('Capitale de la Jamaïque')
    const flag = quiz.questions.find((q) => q.tags.includes('drapeau'))
    expect(flag?.topic).toMatch(/^Drapeau (de|du|des|d')/)
    expect(flag?.topic).not.toBe(flag?.question)
    const grp = quiz.questions.find((q) => q.type === 'ordering')
    expect(grp?.topic).toMatch(/ : .+,/) // libellé + liste des membres
    for (const q of quiz.questions) expect(typeof q.topic).toBe('string')
  })

  it('is deterministic for a given seed', () => {
    expect(generateQuiz(caribbeanRows, schema, { seed: 'test' })).toEqual(quiz)
    expect(generateQuiz(caribbeanRows, schema, { seed: 'other' })).not.toEqual(quiz)
  })

  it('every QCM has at least one correct answer and one distractor, no blank labels', () => {
    for (const q of quiz.questions) {
      if (q.type !== 'qcm') continue
      const correct = q.content.answers.filter((a) => a.isCorrect).length
      expect(correct).toBeGreaterThanOrEqual(1)
      expect(correct).toBeLessThan(q.content.answers.length)
      expect(q.content.answers.every((a) => a.label.trim() !== '')).toBe(true)
      expect(new Set(q.content.answers.map((a) => a.label)).size).toBe(q.content.answers.length)
    }
  })

  it('ordering questions never repeat a value (no ambiguous ties)', () => {
    for (const q of quiz.questions) {
      if (q.type !== 'ordering') continue
      const values = q.explanation.match(/\(([^)]+)\)/g) ?? []
      expect(values.length).toBeGreaterThanOrEqual(3)
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it('produces flag questions with an imageUrl', () => {
    const flagQs = quiz.questions.filter((q) => q.tags.includes('drapeau'))
    expect(flagQs.length).toBeGreaterThan(10)
    for (const q of flagQs) {
      expect(q.type).toBe('qcm')
      expect(q.imageUrl).toMatch(/^https?:\/\//)
      expect(q.question).toContain('drapeau')
      if (q.type === 'qcm') {
        expect(q.content.answers.filter((a) => a.isCorrect)).toHaveLength(1)
        expect(q.content.answers.every((a) => !a.label.startsWith('http'))).toBe(true)
      }
    }
  })

  it('produces vrai/faux and texte à trous questions from text columns', () => {
    const booleans = quiz.questions.filter((q) => q.type === 'boolean')
    const clozes = quiz.questions.filter((q) => q.type === 'cloze')
    expect(booleans.length).toBeGreaterThan(0)
    expect(clozes.length).toBeGreaterThan(0)
    for (const q of booleans) expect(typeof (q.content as { isTrue: boolean }).isTrue).toBe('boolean')
    for (const q of clozes) {
      expect(q.question).toMatch(/_{3,}/)
      expect((q.content as { expectedAnswers: string[] }).expectedAnswers.length).toBeGreaterThan(0)
    }
    // les deux valeurs de vérité apparaissent
    expect(new Set(booleans.map((q) => (q.content as { isTrue: boolean }).isTrue)).size).toBe(2)
  })

  it('numeric columns feed every question type, not just estimation and ordering', () => {
    const byCol = (c: string) => quiz.questions.filter((q) => q.tags.includes(c))
    const types = (c: string) => new Set(byCol(c).map((q) => q.type))
    // population : nombre unique, pas une année
    expect(types('population')).toEqual(new Set(['numeric', 'ordering', 'qcm', 'boolean', 'matching']))
    // pas de texte à trous sur un nombre non-année (taper la valeur exacte serait absurde)
    expect(byCol('population').some((q) => q.type === 'cloze')).toBe(false)
    // independance : année, non unique (Amérique centrale = 1821) → pas de QCM inversé, mais du cloze
    expect(types('independance').has('cloze')).toBe(true)
    expect(byCol('independance').some((q) => q.question.startsWith('Quel'))).toBe(false)
    // QCM numérique : bonne réponse + distracteurs tous distincts, aucun 'http'
    for (const q of byCol('population')) {
      if (q.type !== 'qcm') continue
      expect(q.content.answers.filter((a) => a.isCorrect)).toHaveLength(1)
      expect(new Set(q.content.answers.map((a) => a.label)).size).toBe(q.content.answers.length)
    }
  })

  it('adds declared aliases to the accepted answers of a cloze', () => {
    const withAlias = generateQuiz(caribbeanRows, schema, {
      seed: 'test',
      aliases: { "Port-d'Espagne": ['Port of Spain'] },
    })
    const cloze = withAlias.questions.find((q) => q.type === 'cloze' && q.question.startsWith('Capitale de Trinité-et-Tobago'))
    expect(cloze?.type).toBe('cloze')
    if (cloze?.type === 'cloze') {
      expect(cloze.content.expectedAnswers).toContain("Port-d'Espagne")
      expect(cloze.content.expectedAnswers).toContain('Port of Spain')
    }
    // sans alias : seule la valeur du CSV
    const plain = quiz.questions.find((q) => q.type === 'cloze' && q.question.startsWith('Capitale de Trinité-et-Tobago'))
    if (plain?.type === 'cloze') expect(plain.content.expectedAnswers).toEqual(["Port-d'Espagne"])
  })

  it('produces silhouette questions when shapes are supplied', () => {
    const shaped = generateQuiz(caribbeanRows, schema, {
      seed: 'test',
      shapes: { Cuba: '<svg viewBox="0 0 100 100"><path d="M0,0L10,0L5,10Z"/></svg>', Jamaïque: '<svg viewBox="0 0 100 100"><path d="M0,0L9,1L4,9Z"/></svg>', Haïti: '<svg viewBox="0 0 100 100"><path d="M1,1L8,2L3,8Z"/></svg>', Belize: '<svg viewBox="0 0 100 100"><path d="M2,2L7,3L2,7Z"/></svg>' },
    })
    expect(() => parseQuiz(shaped)).not.toThrow()
    const sil = shaped.questions.filter((q) => q.category === 'silhouette')
    expect(sil.length).toBe(4)
    expect(shaped.categories.find((c) => c.id === 'silhouette')?.label).toBe('Silhouette')
    for (const q of sil) {
      expect(q.type).toBe('qcm')
      expect(q.shapeSvg).toMatch(/^<svg/)
      expect(q.imageUrl).toBeUndefined()
      expect(q.topic).toMatch(/^Silhouette /)
      if (q.type === 'qcm') expect(q.content.answers.filter((a) => a.isCorrect)).toHaveLength(1)
    }
    // sans shapes : aucune question silhouette, aucune catégorie silhouette
    expect(quiz.questions.some((q) => q.category === 'silhouette')).toBe(false)
  })

  it('produces flag + year questions when an image column and a year column coexist', () => {
    const iy = quiz.questions.filter((q) => q.imageUrl && /En quelle année/.test(q.question))
    expect(iy.length).toBeGreaterThan(5)
    for (const q of iy) {
      expect(q.type).toBe('qcm')
      expect(q.imageUrl).toMatch(/^https?:\/\//)
      if (q.type === 'qcm') {
        expect(q.content.answers.filter((a) => a.isCorrect)).toHaveLength(1)
        expect(q.content.answers.every((a) => /^\d{3,4}$/.test(a.label))).toBe(true) // des années
      }
    }
  })

  it('skips empty cells: no independence question about a non-sovereign territory', () => {
    const territories = ['Guadeloupe', 'Martinique', 'Aruba', 'Curaçao', 'Porto Rico', 'Saint-Martin', 'Saint-Barthélemy', 'Sint Maarten', 'Îles Caïmans']
    const independence = quiz.questions.filter((q) => q.tags.includes('independance'))
    for (const q of independence) {
      const blob = JSON.stringify(q)
      expect(territories.some((t) => blob.includes(t))).toBe(false)
    }
  })

  it('generates English prompts when locale is "en" (data still FR until phase 3)', () => {
    const en = generateQuiz(caribbeanRows, schema, { seed: 'test', locale: 'en' })
    expect(() => parseQuiz(en)).not.toThrow()

    const cloze = en.questions.find((q) => q.type === 'cloze' && q.subject === 'Cuba' && q.tags.includes('capitale'))
    expect(cloze?.question).toBe('Capitale of Cuba: ___')

    const ordering = en.questions.find((q) => q.type === 'ordering')
    expect(ordering?.question).toMatch(/^Order these \S+ by .+ \((ascending|descending)\)\.$/)

    const matching = en.questions.find((q) => q.type === 'matching')
    expect(matching?.question).toMatch(/^Match each \S+ to: /)

    const truthy = en.questions.find((q) => q.type === 'boolean')
    expect(truthy?.explanation).toMatch(/^(True|False)\. /)

    // aucune formulation française résiduelle dans les énoncés
    for (const q of en.questions) {
      expect(q.question).not.toMatch(/Classez|Associez|Estimez|En quelle année|représente-t-il/)
    }
  })

  it('is deterministic per (seed, locale)', () => {
    const a = generateQuiz(caribbeanRows, schema, { seed: 'x', locale: 'en' })
    const b = generateQuiz(caribbeanRows, schema, { seed: 'x', locale: 'en' })
    expect(a).toEqual(b)
    expect(generateQuiz(caribbeanRows, schema, { seed: 'x', locale: 'fr' })).not.toEqual(a)
  })

  it('keeps question ids and subjects locale-independent (history survives a language switch)', () => {
    const fr = generateQuiz(caribbeanRows, schema, { seed: 'k', locale: 'fr' })
    const en = generateQuiz(caribbeanRows, schema, { seed: 'k', locale: 'en' })
    const byId = (q: { id: string }) => q.id
    expect(new Set(en.questions.map(byId))).toEqual(new Set(fr.questions.map(byId)))
    const frCloze = fr.questions.find((q) => q.type === 'cloze' && q.subject === 'Cuba' && q.tags.includes('capitale'))
    const enCloze = en.questions.find((q) => q.id === frCloze?.id)
    expect(enCloze?.subject).toBe('Cuba')
  })

  it('translates data (names, values, articles, column labels) with i18n + locale "en"', () => {
    const en = generateQuiz(caribbeanRows, schema, { seed: 'test', locale: 'en', i18n: caribbeanI18n })
    expect(() => parseQuiz(en)).not.toThrow()
    const blob = JSON.stringify(en)

    // libellé de colonne traduit, nom + valeur traduits
    const cloze = en.questions.find((q) => q.type === 'cloze' && q.subject === 'Cuba' && q.tags.includes('capitale'))
    expect(cloze?.question).toBe('Capital of Cuba: ___')
    if (cloze?.type === 'cloze') expect(cloze.content.expectedAnswers).toContain('Havana')

    // article anglais « of the … »
    const bahamas = en.questions.find((q) => q.subject === 'Bahamas' && q.topic?.startsWith('Capital'))
    expect(bahamas?.topic).toBe('Capital of the Bahamas')

    // les valeurs de cellules traduites remplacent les formes françaises à l'affichage
    expect(blob).not.toContain('La Havane')
    expect(blob).toContain('Havana')
    expect(blob).toContain('Port of Spain')
    expect(en.questions.some((q) => q.question.includes('Jamaica'))).toBe(true)

    // mais le champ `subject` (clé d'historique) reste la valeur FR canonique,
    // doublé d'un `subjectLabel` traduit pour l'affichage
    const jam = en.questions.find((q) => q.subject === 'Jamaïque')
    expect(jam).toBeDefined()
    expect(jam?.subjectLabel).toBe('Jamaica')
    // pas de subjectLabel quand le nom ne change pas
    expect(en.questions.find((q) => q.subject === 'Cuba')?.subjectLabel).toBeUndefined()
  })

  it('keeps FR output unchanged when i18n is supplied but locale stays "fr"', () => {
    const plain = generateQuiz(caribbeanRows, schema, { seed: 'test' })
    const withSidecar = generateQuiz(caribbeanRows, schema, { seed: 'test', i18n: caribbeanI18n })
    expect(withSidecar).toEqual(plain)
  })

  it('is deterministic per (seed, locale, i18n)', () => {
    const a = generateQuiz(caribbeanRows, schema, { seed: 'z', locale: 'en', i18n: caribbeanI18n })
    const b = generateQuiz(caribbeanRows, schema, { seed: 'z', locale: 'en', i18n: caribbeanI18n })
    expect(a).toEqual(b)
  })

  it('picks the first text column as subject when no header hint matches', () => {
    const rows: Row[] = [
      { ref: '1', lieu: 'Paris', pop: '2100000' },
      { ref: '2', lieu: 'Lyon', pop: '520000' },
      { ref: '3', lieu: 'Nice', pop: '340000' },
      { ref: '4', lieu: 'Brest', pop: '140000' },
    ]
    const s = inferSchema(rows)
    expect(s.subjectColumn).toBe('lieu')
    const q = generateQuiz(rows, s, { seed: 's' })
    expect(() => parseQuiz(q)).not.toThrow()
    expect(q.questions.length).toBeGreaterThan(0)
  })
})
