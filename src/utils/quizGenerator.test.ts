import { describe, expect, it } from 'vitest'
import caribbeanCsv from '../data/caribbean.csv?raw'
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

  it('skips empty cells: no independence question about a non-sovereign territory', () => {
    const territories = ['Guadeloupe', 'Martinique', 'Aruba', 'Curaçao', 'Porto Rico', 'Saint-Martin', 'Îles Caïmans']
    const independence = quiz.questions.filter((q) => q.tags.includes('independance'))
    for (const q of independence) {
      const blob = JSON.stringify(q)
      expect(territories.some((t) => blob.includes(t))).toBe(false)
    }
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
