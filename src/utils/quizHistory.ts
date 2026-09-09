import type { AnswersByQuestion, Question, Theme } from '../types/quiz'
import type { ChartGroup, MissedQuestion, QuestionResultPayload, QuestionResultRow, QuizRecords, QuizResultPayload, QuizResultRow, StatBucket } from '../types/history'
import { isCorrect } from '../components/ResultPage'

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

/** Construit le résumé d'une partie terminée, prêt à être enregistré. Les thèmes sont figés en libellés (pas des ids) pour rester lisibles même si le quiz importé change ensuite. */
export function buildQuizResultPayload(questions: Question[], answers: AnswersByQuestion, themes: Theme[], elapsedSeconds: number, quizTitle: string): QuizResultPayload {
  const earnedPoints = questions.filter((question) => isCorrect(question, answers[question.id])).reduce((sum, question) => sum + question.points, 0)
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0)
  const themeLabel = (id: string) => themes.find((theme) => theme.id === id)?.label ?? id

  return {
    quiz_title: quizTitle,
    score: totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0,
    earned_points: earnedPoints,
    total_points: totalPoints,
    elapsed_seconds: elapsedSeconds,
    question_count: questions.length,
    themes: Array.from(new Set(questions.map((question) => themeLabel(question.theme)))),
    by_theme: aggregate(questions, answers, (question) => themeLabel(question.theme)),
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

export async function fetchQuizHistory(): Promise<QuizResultRow[]> {
  return readRows<QuizResultRow>(QUIZ_KEY).sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** Une ligne par question de la partie, pour pouvoir repérer plus tard les questions ratées de façon récurrente. */
export function buildQuestionResultPayloads(questions: Question[], answers: AnswersByQuestion, quizTitle: string): QuestionResultPayload[] {
  return questions.map((question) => ({
    quiz_title: quizTitle,
    question_id: question.id,
    question_text: question.question,
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

/** `rows` peut être dans n'importe quel ordre — seuls les agrégats comptent ici. */
export function computeRecords(rows: QuizResultRow[]): QuizRecords {
  if (!rows.length) return { gamesPlayed: 0, bestScore: 0, averageScore: 0, totalPlaytimeSeconds: 0 }
  return {
    gamesPlayed: rows.length,
    bestScore: Math.max(...rows.map((row) => row.score)),
    averageScore: Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length),
    totalPlaytimeSeconds: rows.reduce((sum, row) => sum + row.elapsed_seconds, 0),
  }
}

/** Cumule les buckets `correct`/`total` d'une clé (par ex. `by_theme`) sur l'ensemble de l'historique. */
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

/** Convertit des buckets cumulés en groupes prêts pour `PieChart`. */
export function bucketsToChartGroups(buckets: Record<string, StatBucket>, labelOf: (key: string) => string): ChartGroup[] {
  return Object.entries(buckets).map(([key, bucket]) => ({
    key,
    label: labelOf(key),
    data: [
      { label: 'Réussi', value: bucket.correct, color: '#34d399' },
      { label: 'Raté', value: bucket.total - bucket.correct, color: '#fb7185' },
    ].filter((slice) => slice.value > 0),
  }))
}
