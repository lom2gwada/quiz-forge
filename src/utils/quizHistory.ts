import type { AnswersByQuestion, Category, Question } from '../types/quiz'
import type { ChartGroup, MissedQuestion, QuestionResultPayload, QuestionResultRow, QuizRecords, QuizResultPayload, QuizResultRow, StatBucket } from '../types/history'
import { isCorrect } from '../components/ResultPage'
import type { GameMode } from '../components/QuizPage'

const QUIZ_KEY = 'quiz-forge:quiz-results'
const QUESTION_KEY = 'quiz-forge:question-results'

function readRows<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function writeRows<T>(key: string, rows: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(rows))
  } catch {
    /* quota dépassé ou navigation privée : l'historique n'est pas bloquant */
  }
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

function aggregate(questions: Question[], answers: AnswersByQuestion, keyOf: (question: Question) => string): Record<string, StatBucket> {
  const buckets: Record<string, StatBucket> = {}
  questions.forEach((question) => {
    const key = keyOf(question)
    const bucket = buckets[key] ?? { correct: 0, total: 0 }
    bucket.total += 1
    if (isCorrect(question, answers[question.id])) bucket.correct += 1
    buckets[key] = bucket
  })
  return buckets
}

/** Construit le résumé d'une partie terminée, prêt à être enregistré. On fige les **ids** de
 * catégorie (noms de colonnes, indépendants de la langue), pas les libellés : l'historique ne
 * se retrouve pas en langue mixte si l'utilisateur change de langue. Les libellés sont résolus
 * à l'affichage (`HistoryPage`). Les anciennes lignes (libellés FR) : repli sur la clé telle quelle. */
export function buildQuizResultPayload(questions: Question[], answers: AnswersByQuestion, _categories: Category[], elapsedSeconds: number, quizTitle: string, mode: GameMode = 'classic'): QuizResultPayload {
  const correctQuestions = questions.filter((question) => isCorrect(question, answers[question.id]))
  const earnedPoints = correctQuestions.reduce((sum, question) => sum + question.points, 0)
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0)

  return {
    quiz_title: quizTitle,
    mode,
    score: totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0,
    earned_points: earnedPoints,
    total_points: totalPoints,
    correct_count: correctQuestions.length,
    elapsed_seconds: elapsedSeconds,
    question_count: questions.length,
    categories: Array.from(new Set(questions.map((question) => question.category))),
    by_category: aggregate(questions, answers, (question) => question.category),
    by_type: aggregate(questions, answers, (question) => question.type),
    by_difficulty: aggregate(questions, answers, (question) => question.difficulty),
  }
}

/** Best-effort : une partie non enregistrée ne doit jamais empêcher l'utilisateur de voir son résultat. */
export async function saveQuizResult(payload: QuizResultPayload): Promise<void> {
  const rows = readRows<QuizResultRow>(QUIZ_KEY)
  rows.unshift({ ...payload, id: newId(), created_at: new Date().toISOString() })
  writeRows(QUIZ_KEY, rows)
}

type LegacyQuizResultRow = QuizResultRow & { themes?: string[]; by_theme?: Record<string, StatBucket>; mode?: GameMode; correct_count?: number }

/** Reprend les anciennes lignes d'historique (`themes`/`by_theme`, absence de `mode`/`correct_count`
 * — toutes antérieures au contre-la-montre/sans-faute, donc forcément « classique ») sous les noms actuels. */
function normalizeRow(row: LegacyQuizResultRow): QuizResultRow {
  const withCategories = row.by_category !== undefined ? row : { ...row, categories: row.categories ?? row.themes ?? [], by_category: row.by_theme ?? {} }
  return { ...withCategories, mode: withCategories.mode ?? 'classic', correct_count: withCategories.correct_count ?? 0 }
}

export async function fetchQuizHistory(): Promise<QuizResultRow[]> {
  return readRows<LegacyQuizResultRow>(QUIZ_KEY).map(normalizeRow).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** Une ligne par question de la partie, pour pouvoir repérer plus tard les questions ratées de façon récurrente. */
export function buildQuestionResultPayloads(questions: Question[], answers: AnswersByQuestion, quizTitle: string): QuestionResultPayload[] {
  return questions.map((question) => ({
    quiz_title: quizTitle,
    question_id: question.id,
    // `topic` (libellé neutre) plutôt que l'énoncé joué : la liste « à retravailler » reste lisible
    // (pas de marqueur `___`, pas d'affirmation V/F, pas d'énoncé image générique).
    question_text: question.topic ?? question.question,
    correct: isCorrect(question, answers[question.id]),
  }))
}

/** Best-effort, comme `saveQuizResult`. */
export async function saveQuestionResults(payloads: QuestionResultPayload[]): Promise<void> {
  if (!payloads.length) return
  const rows = readRows<QuestionResultRow>(QUESTION_KEY)
  const created_at = new Date().toISOString()
  rows.push(...payloads.map((payload) => ({ ...payload, id: newId(), created_at })))
  writeRows(QUESTION_KEY, rows)
}

export async function fetchQuestionResults(): Promise<QuestionResultRow[]> {
  return readRows<QuestionResultRow>(QUESTION_KEY)
}

/** Regroupe les résultats par question pour un quiz donné, ne garde que celles ratées au moins une fois, triées de la plus problématique à la moins. */
export function computeMissedQuestions(rows: QuestionResultRow[], quizTitle: string): MissedQuestion[] {
  const byQuestion = new Map<string, MissedQuestion>()
  rows.filter((row) => row.quiz_title === quizTitle).forEach((row) => {
    const entry = byQuestion.get(row.question_id) ?? { questionId: row.question_id, questionText: row.question_text, attempts: 0, wrongCount: 0 }
    entry.attempts += 1
    if (!row.correct) entry.wrongCount += 1
    entry.questionText = row.question_text
    byQuestion.set(row.question_id, entry)
  })
  return Array.from(byQuestion.values()).filter((entry) => entry.wrongCount > 0).sort((a, b) => b.wrongCount - a.wrongCount)
}

/** `rows` peut être dans n'importe quel ordre — seuls les agrégats comptent ici.
 * `bestScore`/`averageScore` ne portent que sur le mode classique (le `%` n'est pas comparable
 * entre modes : `correct_count` est la métrique pertinente pour contre-la-montre et sans-faute). */
export function computeRecords(rows: QuizResultRow[]): QuizRecords {
  if (!rows.length) return { gamesPlayed: 0, bestScore: 0, averageScore: 0, totalPlaytimeSeconds: 0, bestTimeAttackCorrect: 0, bestStreak: 0 }
  const classicRows = rows.filter((row) => row.mode === 'classic')
  const timeAttackRows = rows.filter((row) => row.mode === 'timeAttack')
  const noMistakeRows = rows.filter((row) => row.mode === 'noMistake')
  return {
    gamesPlayed: rows.length,
    bestScore: classicRows.length ? Math.max(...classicRows.map((row) => row.score)) : 0,
    averageScore: classicRows.length ? Math.round(classicRows.reduce((sum, row) => sum + row.score, 0) / classicRows.length) : 0,
    totalPlaytimeSeconds: rows.reduce((sum, row) => sum + row.elapsed_seconds, 0),
    bestTimeAttackCorrect: timeAttackRows.length ? Math.max(...timeAttackRows.map((row) => row.correct_count)) : 0,
    bestStreak: noMistakeRows.length ? Math.max(...noMistakeRows.map((row) => row.correct_count)) : 0,
  }
}

/** Cumule les buckets `correct`/`total` d'une clé (par ex. `by_category`) sur l'ensemble de l'historique. */
export function sumBuckets(rows: QuizResultRow[], pick: (row: QuizResultRow) => Record<string, StatBucket>): Record<string, StatBucket> {
  const totals: Record<string, StatBucket> = {}
  rows.forEach((row) => {
    Object.entries(pick(row)).forEach(([key, bucket]) => {
      const total = totals[key] ?? { correct: 0, total: 0 }
      total.correct += bucket.correct
      total.total += bucket.total
      totals[key] = total
    })
  })
  return totals
}

/** Convertit des buckets cumulés en groupes prêts pour `PieChart`. `passLabel`/`failLabel`
 * viennent de l'UI (i18n) ; défauts FR pour les appels hors composant / tests. */
export function bucketsToChartGroups(
  buckets: Record<string, StatBucket>,
  labelOf: (key: string) => string,
  passLabel = 'Réussi',
  failLabel = 'Raté',
): ChartGroup[] {
  return Object.entries(buckets).map(([key, bucket]) => ({
    key,
    label: labelOf(key),
    data: [
      { label: passLabel, value: bucket.correct, color: '#34d399' },
      { label: failLabel, value: bucket.total - bucket.correct, color: '#fb7185' },
    ].filter((slice) => slice.value > 0),
  }))
}
