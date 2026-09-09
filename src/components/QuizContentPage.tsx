import type { Difficulty, Question, Quiz } from '../types/quiz'
import type { GenSchema, Row } from '../utils/quizGenerator'
import { formatNumber } from '../utils/number'
import { DataTable } from './DataTable'
import { GeneratorPanel } from './GeneratorPanel'
import { PieChart } from './PieChart'
import { TYPE_LABELS } from './QuizPage'

const THEME_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#22d3ee', '#f472b6', '#94a3b8']
const QUESTION_TYPES = Object.keys(TYPE_LABELS) as Question['type'][]
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: '#34d399', medium: '#38bdf8', hard: '#fb7185' }
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Facile', medium: 'Intermédiaire', hard: 'Difficile' }

interface QuizContentPageProps {
  quiz: Quiz
  dataset: { rows: Row[]; schema: GenSchema } | null
  onBack: () => void
  onJsonChange: (file?: File) => void
  onCsvChange: (file?: File) => void
  onGenerate: (schema: GenSchema, seed: string) => void
  onRegenerate: () => void
  fileError: string
  genError: string
}

export function QuizContentPage({ quiz, dataset, onBack, onJsonChange, onCsvChange, onGenerate, onRegenerate, fileError, genError }: QuizContentPageProps) {
  const byCategory = quiz.categories
    .map((category, index) => ({
      label: category.label,
      value: quiz.questions.filter((question) => question.category === category.id).length,
      color: THEME_COLORS[index % THEME_COLORS.length],
    }))
    .filter((slice) => slice.value > 0)

  const byType = QUESTION_TYPES
    .map((type, index) => ({
      label: TYPE_LABELS[type],
      value: quiz.questions.filter((question) => question.type === type).length,
      color: THEME_COLORS[index % THEME_COLORS.length],
    }))
    .filter((slice) => slice.value > 0)

  const byDifficulty = DIFFICULTIES
    .map((difficulty) => ({
      label: DIFFICULTY_LABELS[difficulty],
      value: quiz.questions.filter((question) => question.difficulty === difficulty).length,
      color: DIFFICULTY_COLORS[difficulty],
    }))
    .filter((slice) => slice.value > 0)

  return <section className="stats-page">
    <div className="stats-header">
      <h2>Quiz</h2>
      <button type="button" className="secondary" onClick={onBack}>Retour</button>
    </div>
    {quiz.metadata.description && <p className="quiz-description">{quiz.metadata.description}</p>}
    {dataset && <button type="button" className="secondary regenerate-btn" onClick={onRegenerate}>🎲 Régénérer les questions</button>}
    <div className="quiz-import">
      <label className="file-input">Importer un CSV<input type="file" accept="text/csv,.csv,.tsv,text/plain" onChange={(event) => onCsvChange(event.target.files?.[0])} /></label>
      <label className="file-input">Importer un quiz (JSON)<input type="file" accept="application/json,.json" onChange={(event) => onJsonChange(event.target.files?.[0])} /></label>
      {fileError && <p className="alert" role="alert">{fileError}</p>}
    </div>
    {dataset && <GeneratorPanel key={Object.keys(dataset.rows[0] ?? {}).join(',')} rows={dataset.rows} schema={dataset.schema} onGenerate={onGenerate} error={genError} />}
    <h3 className="stats-group-title">Répartition des questions</h3>
    <div className="stats-grid">
      <PieChart title={`Catégories — ${formatNumber(quiz.questions.length)} questions`} data={byCategory} />
      <PieChart title={`Types — ${formatNumber(quiz.questions.length)} questions`} data={byType} />
      <PieChart title={`Difficulté — ${formatNumber(quiz.questions.length)} questions`} data={byDifficulty} />
    </div>
    {dataset && <DataTable rows={dataset.rows} schema={dataset.schema} />}
  </section>
}
