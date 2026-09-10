import { describe, expect, it } from 'vitest'
import type { BooleanQuestion, Category, QCMQuestion } from '../types/quiz'
import type { QuestionResultRow, QuizResultRow } from '../types/history'
import { bucketsToChartGroups, buildQuestionResultPayloads, buildQuizResultPayload, computeMissedQuestions, computeRecords, sumBuckets } from './quizHistory'

const categories: Category[] = [{ id: 'histoire', label: 'Histoire' }, { id: 'geo', label: 'Géographie' }]

const qcm: QCMQuestion = {
  id: 'q1', category: 'histoire', difficulty: 'easy', tags: [], explanation: '', points: 1,
  type: 'qcm', question: 'Q ?',
  content: { multiple: false, answers: [{ id: 'a', label: 'A', isCorrect: true }, { id: 'b', label: 'B', isCorrect: false }] },
}
const bool: BooleanQuestion = {
  id: 'q2', category: 'geo', difficulty: 'medium', tags: [], explanation: '', points: 2,
  type: 'boolean', question: 'Vrai ou faux ?', content: { isTrue: true },
}

describe('buildQuizResultPayload', () => {
  it('computes the score and point totals', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['a'], q2: ['true'] }, categories, 42, 'Culture générale')
    expect(payload.score).toBe(100)
    expect(payload.earned_points).toBe(3)
    expect(payload.total_points).toBe(3)
    expect(payload.elapsed_seconds).toBe(42)
    expect(payload.question_count).toBe(2)
    expect(payload.quiz_title).toBe('Culture générale')
  })

  it('computes a partial score when some answers are wrong', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['b'], q2: ['true'] }, categories, 0, 'Culture générale')
    expect(payload.score).toBe(67)
    expect(payload.earned_points).toBe(2)
  })

  it('stores category ids (language-independent) and dedupes them', () => {
    const payload = buildQuizResultPayload([qcm, bool], {}, categories, 0, 'Culture générale')
    expect(payload.categories).toEqual(['histoire', 'geo'])
  })

  it('aggregates correctness by category id, type and difficulty', () => {
    const payload = buildQuizResultPayload([qcm, bool], { q1: ['a'], q2: ['false'] }, categories, 0, 'Culture générale')
    expect(payload.by_category).toEqual({ histoire: { correct: 1, total: 1 }, geo: { correct: 0, total: 1 } })
    expect(payload.by_type).toEqual({ qcm: { correct: 1, total: 1 }, boolean: { correct: 0, total: 1 } })
    expect(payload.by_difficulty).toEqual({ easy: { correct: 1, total: 1 }, medium: { correct: 0, total: 1 } })
  })

  it('returns a score of 0 for an empty question set', () => {
    const payload = buildQuizResultPayload([], {}, categories, 0, 'Culture générale')
    expect(payload.score).toBe(0)
    expect(payload.categories).toEqual([])
  })

  it('tags the payload with the given quiz title', () => {
    expect(buildQuizResultPayload([qcm], {}, categories, 0, 'Test technique IT').quiz_title).toBe('Test technique IT')
  })
})

function row(overrides: Partial<QuizResultRow>): QuizResultRow {
  return {
    id: '1', created_at: '2026-01-01T00:00:00Z', quiz_title: 'Culture générale', score: 50, earned_points: 1, total_points: 2,
    elapsed_seconds: 60, question_count: 2, categories: [], by_category: {}, by_type: {}, by_difficulty: {},
    ...overrides,
  }
}

describe('computeRecords', () => {
  it('returns zeroed records for an empty history', () => {
    expect(computeRecords([])).toEqual({ gamesPlayed: 0, bestScore: 0, averageScore: 0, totalPlaytimeSeconds: 0 })
  })

  it('counts games played', () => {
    expect(computeRecords([row({}), row({}), row({})]).gamesPlayed).toBe(3)
  })

  it('finds the best score regardless of row order', () => {
    expect(computeRecords([row({ score: 40 }), row({ score: 90 }), row({ score: 70 })]).bestScore).toBe(90)
  })

  it('rounds the average score', () => {
    expect(computeRecords([row({ score: 40 }), row({ score: 41 })]).averageScore).toBe(41)
  })

  it('sums total playtime across all games', () => {
    expect(computeRecords([row({ elapsed_seconds: 30 }), row({ elapsed_seconds: 45 })]).totalPlaytimeSeconds).toBe(75)
  })
})

describe('sumBuckets', () => {
  it('sums correct/total across every row for the same key', () => {
    const rows = [
      row({ by_category: { Histoire: { correct: 1, total: 2 } } }),
      row({ by_category: { Histoire: { correct: 2, total: 3 } } }),
    ]
    expect(sumBuckets(rows, (r) => r.by_category)).toEqual({ Histoire: { correct: 3, total: 5 } })
  })

  it('keeps separate keys separate', () => {
    const rows = [
      row({ by_category: { Histoire: { correct: 1, total: 1 } } }),
      row({ by_category: { Géographie: { correct: 0, total: 1 } } }),
    ]
    expect(sumBuckets(rows, (r) => r.by_category)).toEqual({
      Histoire: { correct: 1, total: 1 },
      Géographie: { correct: 0, total: 1 },
    })
  })

  it('returns an empty object for an empty history', () => {
    expect(sumBuckets([], (r) => r.by_category)).toEqual({})
  })
})

describe('bucketsToChartGroups', () => {
  it('splits each bucket into a Réussi/Raté pie slice pair', () => {
    const groups = bucketsToChartGroups({ Histoire: { correct: 3, total: 5 } }, (key) => key)
    expect(groups).toEqual([{
      key: 'Histoire', label: 'Histoire',
      data: [{ label: 'Réussi', value: 3, color: '#34d399' }, { label: 'Raté', value: 2, color: '#fb7185' }],
    }])
  })

  it('omits a slice when its value is zero', () => {
    const perfect = bucketsToChartGroups({ Histoire: { correct: 4, total: 4 } }, (key) => key)
    expect(perfect[0].data).toEqual([{ label: 'Réussi', value: 4, color: '#34d399' }])
  })

  it('applies the label resolver to each key', () => {
    const groups = bucketsToChartGroups({ qcm: { correct: 1, total: 1 } }, () => 'QCM')
    expect(groups[0].label).toBe('QCM')
  })
})

describe('buildQuestionResultPayloads', () => {
  it('tags each question with its own correctness', () => {
    const payloads = buildQuestionResultPayloads([qcm, bool], { q1: ['a'], q2: ['false'] }, 'Culture générale')
    expect(payloads).toEqual([
      { quiz_title: 'Culture générale', question_id: 'q1', question_text: 'Q ?', correct: true },
      { quiz_title: 'Culture générale', question_id: 'q2', question_text: 'Vrai ou faux ?', correct: false },
    ])
  })

  it('marks an unanswered question as incorrect', () => {
    const [payload] = buildQuestionResultPayloads([qcm], {}, 'Culture générale')
    expect(payload.correct).toBe(false)
  })

  it('prefers the neutral topic label over the played prompt when present', () => {
    const withTopic: QCMQuestion = { ...qcm, topic: 'Capitale de la Jamaïque' }
    const [payload] = buildQuestionResultPayloads([withTopic], {}, 'Culture générale')
    expect(payload.question_text).toBe('Capitale de la Jamaïque')
    // sans topic : on retombe sur l'énoncé
    expect(buildQuestionResultPayloads([qcm], {}, 'Culture générale')[0].question_text).toBe('Q ?')
  })

  it('returns an empty array for no questions', () => {
    expect(buildQuestionResultPayloads([], {}, 'Culture générale')).toEqual([])
  })
})

function questionRow(overrides: Partial<QuestionResultRow>): QuestionResultRow {
  return {
    id: '1', created_at: '2026-01-01T00:00:00Z', quiz_title: 'Culture générale',
    question_id: 'q1', question_text: 'Q ?', correct: true,
    ...overrides,
  }
}

describe('computeMissedQuestions', () => {
  it('counts wrong attempts per question', () => {
    const rows = [
      questionRow({ correct: false }),
      questionRow({ correct: true }),
      questionRow({ correct: false }),
    ]
    const [missed] = computeMissedQuestions(rows, 'Culture générale')
    expect(missed).toEqual({ questionId: 'q1', questionText: 'Q ?', attempts: 3, wrongCount: 2 })
  })

  it('excludes questions that were always answered correctly', () => {
    const rows = [questionRow({ correct: true }), questionRow({ correct: true })]
    expect(computeMissedQuestions(rows, 'Culture générale')).toEqual([])
  })

  it('sorts by wrong count, most missed first', () => {
    const rows = [
      questionRow({ question_id: 'q1', correct: false }),
      questionRow({ question_id: 'q2', correct: false }),
      questionRow({ question_id: 'q2', correct: false }),
    ]
    const missed = computeMissedQuestions(rows, 'Culture générale')
    expect(missed.map((entry) => entry.questionId)).toEqual(['q2', 'q1'])
  })

  it('ignores rows from other quizzes', () => {
    const rows = [questionRow({ quiz_title: 'Autre quiz', correct: false })]
    expect(computeMissedQuestions(rows, 'Culture générale')).toEqual([])
  })

  it('returns an empty array for no history', () => {
    expect(computeMissedQuestions([], 'Culture générale')).toEqual([])
  })
})
