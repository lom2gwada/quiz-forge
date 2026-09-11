import { useEffect, useMemo, useRef, useState } from 'react'
import caribbeanCsv from './data/caribbean.csv?raw'
import { shapes as caribbeanShapes } from './data/shapes'
import { aliases as caribbeanAliases } from './data/aliases'
import { caribbeanI18n } from './data/caribbean.i18n'
import { region as caribbeanRegion, REGION_VIEWBOX, type RegionShape } from './data/region'
import { ChartBackground } from './components/ChartBackground'
import { FilterPanel } from './components/FilterPanel'
import { HistoryPage } from './components/HistoryPage'
import { ProfilePage } from './components/ProfilePage'
import { AtlasPage } from './components/AtlasPage'
import { FicheModal } from './components/FicheModal'
import { QuizContentPage } from './components/QuizContentPage'
import { QuizPage } from './components/QuizPage'
import { ResultPage } from './components/ResultPage'
import type { AnswersByQuestion, Difficulty, Quiz, Question } from './types/quiz'
import type { Profile } from './types/profile'
import { LocaleProvider, useLocale, useT } from './i18n'
import { applyLocale, DEFAULT_LOCALE, resolveLocale, type Locale } from './i18n/locale'
import type { DataI18n } from './i18n/data'
import { buildQuestionResultPayloads, buildQuizResultPayload, saveQuestionResults, saveQuizResult } from './utils/quizHistory'
import { fetchProfile, saveProfile } from './utils/profile'
import { applyTheme } from './utils/theme'
import { parseQuiz } from './utils/quizValidation'
import { formatNumber } from './utils/number'
import { generateQuiz, inferSchema, parseCsv, randomSeed } from './utils/quizGenerator'
import type { GenSchema, Row } from './utils/quizGenerator'
import { isSoundMuted, playClick, setSoundMuted } from './utils/sound'
import { shuffle } from './utils/shuffle'

type View = 'start' | 'quiz' | 'results' | 'content' | 'history' | 'profile' | 'atlas'
type Dataset = {
  rows: Row[]
  schema: GenSchema
  shapes?: Record<string, string>
  aliases?: Record<string, string[]>
  region?: Record<string, RegionShape>
  regionViewBox?: string
  i18n?: DataI18n
  /** Nom d'un élément par locale (le CSV n'a pas cette info) ; défaut = `schema.noun`. */
  nouns?: Partial<Record<Locale, string>>
  /** Titre du quiz par locale ; défaut = `schema.title`. La clé d'historique reste `schema.title`. */
  titles?: Partial<Record<Locale, string>>
}

const questionCounts = [5, 10, 20, 30, 50]

const FALLBACK_QUIZ: Quiz = {
  version: '1.0',
  metadata: { title: 'Quiz Forge', author: 'Quiz Forge', createdAt: '2026-09-09', description: 'Importe un CSV pour générer un quiz.' },
  categories: [{ id: 'dataset', label: 'Quiz Forge' }],
  questions: [],
}

/** Clé stable d'un jeu de données pour l'agrégation d'historique (indépendante de la langue). */
function historyKeyOf(dataset: Dataset | null, quiz: Quiz): string {
  return dataset ? dataset.schema.title : quiz.metadata.title
}

function safeGenerate(dataset: Dataset, seed: string, locale: Locale = DEFAULT_LOCALE): { quiz: Quiz; error: string } {
  const schema = {
    ...dataset.schema,
    ...(dataset.nouns?.[locale] ? { noun: dataset.nouns[locale] } : {}),
    ...(dataset.titles?.[locale] ? { title: dataset.titles[locale] } : {}),
  }
  try {
    return {
      quiz: parseQuiz(generateQuiz(dataset.rows, schema, {
        seed, locale, i18n: dataset.i18n, shapes: dataset.shapes, aliases: dataset.aliases,
      })),
      error: '',
    }
  } catch (error) {
    return { quiz: FALLBACK_QUIZ, error: error instanceof Error ? error.message : 'Génération impossible.' }
  }
}

const bundledRows = (() => {
  try { return parseCsv(caribbeanCsv) } catch { return [] as Row[] }
})()
const initialDataset: Dataset | null = bundledRows.length
  ? {
      rows: bundledRows,
      schema: { ...inferSchema(bundledRows), noun: 'territoire', title: 'Autour de la mer des Caraïbes' },
      shapes: caribbeanShapes,
      aliases: caribbeanAliases,
      region: caribbeanRegion,
      regionViewBox: REGION_VIEWBOX,
      i18n: caribbeanI18n,
      nouns: { fr: 'territoire', en: 'territory', es: 'territorio', nl: 'gebied', ht: 'teritwa' },
      titles: {
        fr: 'Autour de la mer des Caraïbes',
        en: 'Around the Caribbean Sea',
        es: 'Alrededor del mar Caribe',
        nl: 'Rond de Caribische Zee',
        ht: 'Toutalantou lanmè Karayib la',
      },
    }
  : null
const initialQuiz = initialDataset ? safeGenerate(initialDataset, 'caribbean').quiz : FALLBACK_QUIZ

function pickRandomQuestions<T>(questions: T[], count: number): T[] {
  return shuffle(questions).slice(0, Math.min(count, questions.length))
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => { fetchProfile().then(setProfile).catch(() => {}) }, [])
  const locale = resolveLocale(profile?.locale)
  useEffect(() => { applyLocale(locale) }, [locale])
  return (
    <LocaleProvider locale={locale}>
      <AppInner profile={profile} onProfileChange={setProfile} />
    </LocaleProvider>
  )
}

function AppInner({ profile, onProfileChange }: { profile: Profile | null; onProfileChange: (p: Profile) => void }) {
  const t = useT()
  const locale = useLocale()
  const tRef = useRef(t)
  tRef.current = t
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz)
  const [dataset, setDataset] = useState<Dataset | null>(initialDataset)
  // Tirage courant : seed + locale ayant produit `quiz`. `initialQuiz` = seed « caribbean » en FR.
  const genRef = useRef<{ seed: string; locale: Locale }>({ seed: 'caribbean', locale: DEFAULT_LOCALE })
  const [ficheSubject, setFicheSubject] = useState<string | null>(null)
  const [genError, setGenError] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [view, setView] = useState<View>('start')
  const [answers, setAnswers] = useState<AnswersByQuestion>({})
  const [fileError, setFileError] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [sessionQuestions, setSessionQuestions] = useState<Quiz['questions']>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [muted, setMuted] = useState(isSoundMuted())
  const theme = profile?.theme ?? 'lagon'
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
        if (!window.confirm(tRef.current('quiz.abandonConfirm'))) {
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
    (!selectedCategories.length || selectedCategories.includes(question.category)) && (!difficulty || question.difficulty === difficulty)), [quiz, selectedCategories, difficulty])

  const toggleCategory = (categoryId: string) => setSelectedCategories((previous) =>
    previous.includes(categoryId) ? previous.filter((id) => id !== categoryId) : [...previous, categoryId])

  const applyQuiz = (next: Quiz) => {
    setQuiz(next)
    setSelectedCategories([]); setDifficulty(''); setSessionQuestions([])
  }

  const applyGenerated = (nextDataset: Dataset, seed: string) => {
    const { quiz: next, error } = safeGenerate(nextDataset, seed, locale)
    setGenError(error)
    if (!error) {
      genRef.current = { seed, locale }
      applyQuiz(next)
    }
  }

  // Changement de langue : on régénère le quiz courant (données + formulations traduites) avec le
  // même seed, pour une bascule immédiate. Le `subject`/`id` des questions restent FR → l'historique suit.
  useEffect(() => {
    if (dataset && genRef.current.locale !== locale) applyGenerated(dataset, genRef.current.seed)
  }, [locale, dataset]) // applyGenerated volontairement hors deps : ne dépend que de (locale, dataset)

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
    const nextDataset: Dataset = { ...dataset, schema }
    setDataset(nextDataset)
    applyGenerated(nextDataset, seed)
    navigate('start')
  }

  // Reconstruit le pool de questions depuis les mêmes données, avec un nouveau seed :
  // autres distracteurs, autres énoncés Vrai/Faux, autres regroupements de classement.
  const regenerateQuestions = () => {
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
    <header><div><p className="eyebrow">QUIZ FORGE</p><h1>{quiz.metadata.title}</h1><p>{t('header.by', { author: quiz.metadata.author })}</p>{view === 'start' && quiz.metadata.description && <p className="quiz-description-preview">{quiz.metadata.description}</p>}</div><div className="header-actions"><button type="button" className="secondary" onClick={toggleSound} aria-label={muted ? t('header.soundOn') : t('header.soundOff')}>{muted ? '🔇' : '🔊'}</button>{view === 'start' && <button type="button" className="secondary" onClick={() => navigate('profile')}>{profile ? `${profile.avatar} ${profile.pseudo}` : `👤 ${t('nav.profile')}`}</button>}{view === 'start' && dataset && <button type="button" className="secondary" onClick={() => navigate('atlas')}>🗺️ {t('nav.fiches')}</button>}{view === 'start' && <button type="button" className="secondary" onClick={() => navigate('content')}>⚙️ {t('nav.quiz')}</button>}</div></header>
    {view === 'start' && <section className="start-page"><FilterPanel categories={quiz.categories} selectedCategories={selectedCategories} difficulty={difficulty} onCategoryToggle={toggleCategory} onDifficultyChange={setDifficulty} /><label className="question-count">{t('start.questionCount')}<select value={questionCount} onChange={(event) => { playClick(); setQuestionCount(Number(event.target.value)) }}>{questionCounts.map((count) => <option key={count} value={count} disabled={count > filteredQuestions.length}>{t(count === 1 ? 'start.count.one' : 'start.count.other', { n: count })}{count > filteredQuestions.length ? t('start.unavailableSuffix') : ''}</option>)}<option value={filteredQuestions.length}>{t('start.allQuestions', { n: formatNumber(filteredQuestions.length) })}</option></select></label><p>{t('start.availability', { n: formatNumber(filteredQuestions.length), picked: Math.min(questionCount, filteredQuestions.length) })}</p><div className="quiz-actions"><button type="button" onClick={startQuiz} disabled={!filteredQuestions.length}>{t('start.play')}</button></div></section>}
    {view === 'quiz' && <QuizPage quiz={quiz} questions={sessionQuestions} onFinish={(nextAnswers, duration) => {
      setAnswers(nextAnswers); setElapsedSeconds(duration); replace('results')
      const historyKey = historyKeyOf(dataset, quiz)
      saveQuizResult(buildQuizResultPayload(sessionQuestions, nextAnswers, quiz.categories, duration, historyKey))
      saveQuestionResults(buildQuestionResultPayloads(sessionQuestions, nextAnswers, historyKey))
    }} onCancel={backToStart} />}
    {view === 'results' && <ResultPage questions={sessionQuestions} answers={answers} categories={quiz.categories} elapsedSeconds={elapsedSeconds} onRestart={backToStart} onViewHistory={() => viewHistory('results')} onViewFiche={dataset ? setFicheSubject : undefined} />}
    {view === 'content' && <QuizContentPage quiz={quiz} dataset={dataset} onBack={() => navigate('start')} onJsonChange={loadJson} onCsvChange={loadCsv} onGenerate={generateFromPanel} onRegenerate={regenerateQuestions} fileError={fileError} genError={genError} />}
    {view === 'atlas' && dataset && <AtlasPage rows={dataset.rows} schema={dataset.schema} shapes={dataset.shapes} region={dataset.region} regionViewBox={dataset.regionViewBox} i18n={dataset.i18n} onOpenFiche={setFicheSubject} onBack={() => navigate('start')} />}
    {ficheSubject && dataset && (() => {
      const row = dataset.rows.find((r) => r[dataset.schema.subjectColumn] === ficheSubject)
      return row ? <FicheModal row={row} schema={dataset.schema} shapes={dataset.shapes} region={dataset.region} regionViewBox={dataset.regionViewBox} i18n={dataset.i18n} onClose={() => setFicheSubject(null)} /> : null
    })()}
    {view === 'history' && <HistoryPage onBack={() => navigate(historyBack)} quiz={quiz} historyKey={historyKeyOf(dataset, quiz)} onReplayMissed={replayMissed} />}
    {view === 'profile' && <ProfilePage profile={profile} onBack={() => navigate('start')} onSave={async (next) => { await saveProfile(next); onProfileChange(next) }} onViewHistory={() => viewHistory('profile')} />}
  </main>
}
