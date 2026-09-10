import { useEffect, useMemo, useState } from 'react'
import type { AnswersByQuestion, Difficulty, Question, Quiz } from '../types/quiz'
import type { MessageKey, TFunction } from '../i18n'
import { useT } from '../i18n'
import { formatDuration } from '../utils/time'
import { shuffle } from '../utils/shuffle'
import { QuestionImage } from './QuestionImage'
import { QuestionRenderer } from './QuestionRenderer'
import { QuestionShape } from './QuestionShape'

export const TYPE_ICONS: Record<Question['type'], string> = { qcm: '🧩', code: '💻', text: '✍️', ordering: '🔀', boolean: '⚖️', cloze: '📝', matching: '🔗', numeric: '🎚️' }
export const QUESTION_TYPES: Question['type'][] = ['qcm', 'code', 'text', 'ordering', 'boolean', 'cloze', 'matching', 'numeric']

export const typeLabel = (type: Question['type'], t: TFunction): string => t(`type.${type}` as MessageKey)
export const difficultyLabel = (difficulty: Difficulty, t: TFunction): string => t(`difficulty.${difficulty}` as MessageKey)

/** Mélange les options de réponse une fois par question, pour que la bonne réponse ne soit pas toujours au même endroit. */
function withShuffledAnswers(question: Question): Question {
  if (question.type === 'qcm') return { ...question, content: { ...question.content, answers: shuffle(question.content.answers) } }
  if (question.type === 'code') return { ...question, content: { ...question.content, answers: shuffle(question.content.answers) } }
  return question
}

interface QuizPageProps {
  quiz: Quiz
  questions: Question[]
  onFinish: (answers: AnswersByQuestion, elapsedSeconds: number) => void
  onCancel: () => void
}

export function QuizPage({ quiz, questions, onFinish, onCancel }: QuizPageProps) {
  const t = useT()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<AnswersByQuestion>({})
  const [elapsed, setElapsed] = useState(0)
  const shuffledQuestions = useMemo(() => questions.map(withShuffledAnswers), [questions])
  const question = shuffledQuestions[current]
  const updateAnswer = (answer: AnswersByQuestion[string]) => setAnswers((previous) => ({ ...previous, [question.id]: answer }))
  const cancelQuiz = () => { if (window.confirm(t('quiz.abandonConfirm'))) onCancel() }

  useEffect(() => {
    const interval = setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!question) return <section className="empty"><h2>{t('quiz.noQuestion')}</h2><p>{t('quiz.noQuestionHint')}</p><button type="button" className="secondary" onClick={onCancel}>{t('common.back')}</button></section>
  const category = quiz.categories.find((item) => item.id === question.category)?.label ?? question.category
  return <section className="quiz-card">
    <div className="question-meta"><span>{TYPE_ICONS[question.type]} {typeLabel(question.type, t)}</span><span>{category}</span><span>{difficultyLabel(question.difficulty, t)}</span><span>{t('quiz.points', { n: question.points })}</span><span>⏱ {formatDuration(elapsed)}</span></div>
    <div className="quiz-progress"><div className="quiz-progress-fill" style={{ width: `${((current + 1) / shuffledQuestions.length) * 100}%` }} /></div>
    <p className="progress">{t('quiz.progress', { current: current + 1, total: shuffledQuestions.length })}</p>
    <div className="question-body" key={question.id}>
      {question.imageUrl && <QuestionImage src={question.imageUrl} alt={question.imageAlt} />}
      {question.shapeSvg && <QuestionShape svg={question.shapeSvg} alt={question.imageAlt} />}
      {question.type !== 'cloze' && <h2>{question.question}</h2>}
      <QuestionRenderer question={question} answer={answers[question.id]} onChange={updateAnswer} />
    </div>
    <div className="quiz-actions">
      <button type="button" className="secondary" onClick={cancelQuiz}>{t('common.cancel')}</button>
      <div className="quiz-nav">
        <button type="button" className="secondary" onClick={() => setCurrent((value) => value - 1)} disabled={current === 0}>{t('quiz.previous')}</button>
        {current === shuffledQuestions.length - 1
          ? <button type="button" onClick={() => onFinish(answers, elapsed)}>{t('quiz.finish')}</button>
          : <button type="button" onClick={() => setCurrent((value) => value + 1)}>{t('quiz.next')}</button>}
      </div>
    </div>
  </section>
}
