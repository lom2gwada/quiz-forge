import { useEffect, useMemo, useRef, useState } from 'react'
import caribbeanCsv from './data/caribbean.csv?raw'
import { ChartBackground } from './components/ChartBackground'
import { FilterPanel } from './components/FilterPanel'
import { HistoryPage } from './components/HistoryPage'
import { ProfilePage } from './components/ProfilePage'
import { QuizContentPage } from './components/QuizContentPage'
import { QuizPage } from './components/QuizPage'
import { ResultPage } from './components/ResultPage'
import type { AnswersByQuestion, Difficulty, Quiz, Question } from './types/quiz'
import type { Profile } from './types/profile'
import { buildQuestionResultPayloads, buildQuizResultPayload, saveQuestionResults, saveQuizResult } from './utils/quizHistory'
import { fetchProfile, saveProfile } from './utils/profile'
import { applyTheme } from './utils/theme'
import { parseQuiz } from './utils/quizValidation'
import { formatNumber } from './utils/number'
import { generateQuiz, inferSchema, parseCsv, randomSeed } from './utils/quizGenerator'
import type { GenSchema, Row } from './utils/quizGenerator'
import { isSoundMuted, playClick, setSoundMuted } from './utils/sound'
import { shuffle } from './utils/shuffle'

type View = 'start' | 'quiz' | 'results' | 'content' | 'history' | 'profile'
type Dataset = { rows: Row[]; schema: GenSchema }

const questionCounts = [5, 10, 20, 30, 50]

const FALLBACK_QUIZ: Quiz = {
  version: '1.0',
  metadata: { title: 'Quiz Forge', author: 'Quiz Forge', createdAt: '2026-09-09', description: 'Importe un CSV pour générer un quiz.' },
  themes: [{ id: 'dataset', label: 'Quiz Forge' }],
  questions: [],
}

function safeGenerate(dataset: Dataset, seed: string): { quiz: Quiz; error: string } {
  try {
    return { quiz: parseQuiz(generateQuiz(dataset.rows, dataset.schema, { seed })), error: '' }
  } catch (error) {
    return { quiz: FALLBACK_QUIZ, error: error instanceof Error ? error.message : 'Génération impossible.' }
  }
}

const bundledRows = (() => {
  try { return parseCsv(caribbeanCsv) } catch { return [] as Row[] }
})()
const initialDataset: Dataset | null = bundledRows.length
  ? { rows: bundledRows, schema: { ...inferSchema(bundledRows), noun: 'territoire', title: 'Autour de la mer des Caraïbes' } }
  : null
const initialQuiz = initialDataset ? safeGenerate(initialDataset, 'caribbean').quiz : FALLBACK_QUIZ

function pickRandomQuestions<T>(questions: T[], count: number): T[] {
  return shuffle(questions).slice(0, Math.min(count, questions.length))
}

export default function App() {
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz)
  const [dataset, setDataset] = useState<Dataset | null>(initialDataset)
  const [genError, setGenError] = useState('')
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [view, setView] = useState<View>('start')
  const [answers, setAnswers] = useState<AnswersByQuestion>({})
  const [fileError, setFileError] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [sessionQuestions, setSessionQuestions] = useState<Quiz['questions']>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [muted, setMuted] = useState(isSoundMuted())
  const [profile, setProfile] = useState<Profile | null>(null)
  const theme = profile?.theme ?? 'lagon'
  useEffect(() => { fetchProfile().then(setProfile).catch(() => {}) }, [])
  useEffect(() => { applyTheme(theme) }, [theme])
  const [historyBack, setHistoryBack] = useState<View>('profile')
  const viewHistory = (from: View) => { setHistoryBack(from); navigate('history') }

  // Le back/swipe-back du navigateur doit se comporter comme le bouton "Retour" de l'appli plutôt que la quitter :
  // chaque navigation interne pousse une entrée d'historique, et on resynchronise `view` sur popstate.
  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => {
    window.history.replaceState({ view: 'start' }, '')
    const onPopState = (event: PopStateEvent) => {
      const nextView = (event.state?.view as View | undefined) ?? 'start'
      if (viewRef.current === 'quiz' && nextView !== 'quiz') {
        if (!window.confirm('Abandonner le quiz en cours ? Votre progression sera perdue.')) {
          window.history.pushState({ view: 'quiz' }, '')
          return
        }
        setAnswers({}); setSessionQuestions([]); setElapsedSeconds(0)
      }
      setView(nextView)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const navigate = (next: View) => { setView(next); window.history.pushState({ view: next }, '') }
  // Remplace l'entrée d'historique courante plutôt que d'en empiler une nouvelle : utilisé pour quitter
  // "quiz" (fin de partie ou abandon), qui n'est pas un état vers lequel on veut pouvoir revenir en arrière.
  const replace = (next: View) => { setView(next); window.history.replaceState({ view: next }, '') }
  const filteredQuestions = useMemo(() => quiz.questions.filter((question) =>
    (!selectedThemes.length || selectedThemes.includes(question.theme)) && (!difficulty || question.difficulty === difficulty)), [quiz, selectedThemes, difficulty])

  const toggleTheme = (themeId: string) => setSelectedThemes((previous) =>
    previous.includes(themeId) ? previous.filter((id) => id !== themeId) : [...previous, themeId])

  const applyQuiz = (next: Quiz) => {
    setQuiz(next)
    setSelectedThemes([]); setDifficulty(''); setSessionQuestions([])
  }

  const applyGenerated = (nextDataset: Dataset, seed: string) => {
    const { quiz: next, error } = safeGenerate(nextDataset, seed)
    setGenError(error)
    if (!error) applyQuiz(next)
  }

  const loadJson = async (file?: File) => {
    if (!file) return
    try {
      applyQuiz(parseQuiz(JSON.parse(await file.text())))
      setDataset(null) // un quiz JSON importé n'a pas de données source à afficher/éditer
      setFileError('')
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Fichier JSON invalide.')
    }
  }

  const loadCsv = async (file?: File) => {
    if (!file) return
    try {
      const rows = parseCsv(await file.text())
      if (!rows.length) throw new Error('CSV vide ou illisible.')
      const nextDataset: Dataset = { rows, schema: inferSchema(rows) }
      setDataset(nextDataset)
      setFileError('')
      setGenError('')
      applyGenerated(nextDataset, randomSeed())
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'CSV invalide.')
    }
  }

  const generateFromPanel = (schema: GenSchema, seed: string) => {
    if (!dataset) return
    const nextDataset: Dataset = { rows: dataset.rows, schema }
    setDataset(nextDataset)
    applyGenerated(nextDataset, seed)
    navigate('start')
  }

  const newDraw = () => {
    if (!dataset) return
    playClick()
    applyGenerated(dataset, randomSeed())
  }

  const startQuiz = () => {
    playClick()
    setAnswers({})
    setSessionQuestions(pickRandomQuestions(filteredQuestions, questionCount))
    navigate('quiz')
  }

  const replayMissed = (questions: Question[]) => {
    playClick()
    setAnswers({})
    setSessionQuestions(questions)
    navigate('quiz')
  }

  const backToStart = () => {
    setAnswers({})
    setSessionQuestions([])
    setElapsedSeconds(0)
    replace('start')
  }

  const toggleSound = () => {
    setSoundMuted(!muted)
    setMuted(!muted)
  }

  return <main className="app-shell">
    <ChartBackground />
    <header><div><p className="eyebrow">QUIZ FORGE</p><h1>{quiz.metadata.title}</h1><p>par {quiz.metadata.author}</p>{view === 'start' && quiz.metadata.description && <p className="quiz-description-preview">{quiz.metadata.description}</p>}</div><div className="header-actions"><button type="button" className="secondary" onClick={toggleSound} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>{view === 'start' && <button type="button" className="secondary" onClick={() => navigate('profile')}>{profile ? `${profile.avatar} ${profile.pseudo}` : '👤 Profil'}</button>}{view === 'start' && <button type="button" className="secondary" onClick={() => navigate('content')}>⚙️ Quiz</button>}</div></header>
    {view === 'start' && <section className="start-page"><FilterPanel themes={quiz.themes} selectedThemes={selectedThemes} difficulty={difficulty} onThemeToggle={toggleTheme} onDifficultyChange={setDifficulty} /><label className="question-count">Nombre de questions<select value={questionCount} onChange={(event) => { playClick(); setQuestionCount(Number(event.target.value)) }}>{questionCounts.map((count) => <option key={count} value={count} disabled={count > filteredQuestions.length}>{count} {count === 1 ? 'question' : 'questions'}{count > filteredQuestions.length ? ' (indisponible)' : ''}</option>)}<option value={filteredQuestions.length}>Toutes les questions ({formatNumber(filteredQuestions.length)})</option></select></label><p>{formatNumber(filteredQuestions.length)} question{filteredQuestions.length > 1 ? 's' : ''} disponible{filteredQuestions.length > 1 ? 's' : ''} — {Math.min(questionCount, filteredQuestions.length)} seront tirées aléatoirement.</p><div className="quiz-actions"><button type="button" onClick={startQuiz} disabled={!filteredQuestions.length}>Démarrer le quiz</button>{dataset && <button type="button" className="secondary" onClick={newDraw}>🎲 Nouveau tirage</button>}</div></section>}
    {view === 'quiz' && <QuizPage quiz={quiz} questions={sessionQuestions} onFinish={(nextAnswers, duration) => {
      setAnswers(nextAnswers); setElapsedSeconds(duration); replace('results')
      saveQuizResult(buildQuizResultPayload(sessionQuestions, nextAnswers, quiz.themes, duration, quiz.metadata.title))
      saveQuestionResults(buildQuestionResultPayloads(sessionQuestions, nextAnswers, quiz.metadata.title))
    }} onCancel={backToStart} />}
    {view === 'results' && <ResultPage questions={sessionQuestions} answers={answers} themes={quiz.themes} elapsedSeconds={elapsedSeconds} onRestart={backToStart} onViewHistory={() => viewHistory('results')} />}
    {view === 'content' && <QuizContentPage quiz={quiz} dataset={dataset} onBack={() => navigate('start')} onJsonChange={loadJson} onCsvChange={loadCsv} onGenerate={generateFromPanel} fileError={fileError} genError={genError} />}
    {view === 'history' && <HistoryPage onBack={() => navigate(historyBack)} quiz={quiz} onReplayMissed={replayMissed} />}
    {view === 'profile' && <ProfilePage profile={profile} onBack={() => navigate('start')} onSave={async (next) => { await saveProfile(next); setProfile((current) => ({ ...current, ...next })) }} onViewHistory={() => viewHistory('profile')} />}
  </main>
}
