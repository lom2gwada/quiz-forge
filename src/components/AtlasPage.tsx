import { useMemo, useState } from 'react'
import type { ColumnSpec, GenSchema, Row } from '../utils/quizGenerator'
import { formatNumericValue } from '../utils/number'
import { HoverPreview } from './HoverPreview'
import { QuestionShape } from './QuestionShape'

interface AtlasPageProps {
  rows: Row[]
  schema: GenSchema
  shapes?: Record<string, string>
  onBack: () => void
  /** Pré-remplit le filtre (ex. « Voir la fiche » depuis une correction). */
  initialQuery?: string
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Une fiche par entité du jeu de données : drapeau + silhouette + tous les champs non vides,
 * rendu générique depuis le schéma (marche pour n'importe quel pack, sans code par sujet). */
export function AtlasPage({ rows, schema, shapes, onBack, initialQuery }: AtlasPageProps) {
  const [query, setQuery] = useState(initialQuery ?? '')
  const [sortKey, setSortKey] = useState('name') // 'name' ou une colonne nombre
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const { subjectColumn, articleColumn, columns } = schema

  const imageCol = useMemo(
    () => Object.keys(columns).find((c) => columns[c].include && columns[c].isImage),
    [columns],
  )
  const factCols = useMemo(
    () => Object.entries(columns).filter(([c, s]) => s.include && !s.isImage && c !== subjectColumn && c !== articleColumn),
    [columns, subjectColumn, articleColumn],
  )
  const numCols = useMemo(
    () => Object.entries(columns).filter(([c, s]) => s.include && s.kind === 'number' && c !== subjectColumn),
    [columns, subjectColumn],
  )

  const changeSort = (key: string) => {
    setSortKey(key)
    setSortDir(key === 'name' || columns[key]?.isYear ? 'asc' : 'desc')
  }
  const numOf = (row: Row, col: string): number | null => {
    const raw = (row[col] ?? '').trim()
    if (!raw) return null // Number('') === 0 : à écarter explicitement
    const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  const q = query.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => (r[subjectColumn] ?? '').toLowerCase().includes(q)) : rows
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = (a[subjectColumn] ?? '').localeCompare(b[subjectColumn] ?? '', 'fr')
        return sortDir === 'asc' ? cmp : -cmp
      }
      const na = numOf(a, sortKey), nb = numOf(b, sortKey)
      if (na === null && nb === null) return 0
      if (na === null) return 1 // valeurs manquantes toujours en fin
      if (nb === null) return -1
      return sortDir === 'asc' ? na - nb : nb - na
    })
  }, [filtered, sortKey, sortDir, subjectColumn])

  const format = (raw: string, spec: ColumnSpec): string => {
    if (spec.kind !== 'number') return raw
    const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(n)) return raw
    return `${formatNumericValue(n, spec.isYear)}${spec.unit && !spec.isYear ? ` ${spec.unit}` : ''}`
  }

  return (
    <section className="atlas-page">
      <div className="stats-header">
        <h2>Fiches</h2>
        <button type="button" className="secondary" onClick={onBack}>Retour</button>
      </div>
      <div className="atlas-controls">
        <input
          className="atlas-search"
          type="search"
          placeholder="Filtrer par nom…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filtrer les fiches par nom"
        />
        <label className="atlas-sort">
          Trier par
          <select value={sortKey} onChange={(event) => changeSort(event.target.value)}>
            <option value="name">nom</option>
            {numCols.map(([col, spec]) => <option key={col} value={col}>{spec.label}</option>)}
          </select>
        </label>
        <button
          type="button"
          className="secondary atlas-dir"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          aria-label={sortDir === 'asc' ? 'Ordre croissant, cliquer pour décroissant' : 'Ordre décroissant, cliquer pour croissant'}
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      <div className="atlas-grid">
        {sorted.map((row) => {
          const name = row[subjectColumn] ?? ''
          const article = articleColumn ? (row[articleColumn] ?? '').trim() : ''
          const flag = imageCol && /^https?:\/\//.test((row[imageCol] ?? '').trim()) ? row[imageCol].trim() : null
          const shape = shapes?.[name]
          return (
            <article className="fiche" key={name}>
              <header className="fiche-head">
                {shape && (
                  <HoverPreview
                    className="fiche-shape-wrap"
                    label={`Silhouette : ${name} (survoler pour agrandir)`}
                    trigger={<QuestionShape svg={shape} className="fiche-shape" />}
                    preview={<QuestionShape svg={shape} />}
                  />
                )}
                <h3>{article && <span className="fiche-article">{article} </span>}{name}</h3>
                {flag && (
                  <HoverPreview
                    href={flag}
                    className="fiche-flag-wrap"
                    label={`Image de ${name} — survoler pour agrandir, cliquer pour ouvrir`}
                    trigger={<img className="fiche-flag" src={flag} alt="" loading="lazy" />}
                    preview={<img src={flag} alt="" />}
                  />
                )}
              </header>
              <dl className="fiche-facts">
                {factCols.map(([col, spec]) => {
                  const raw = (row[col] ?? '').trim()
                  if (!raw) return null
                  const parts = spec.multivalueSeparator
                    ? raw.split(spec.multivalueSeparator).map((s) => s.trim()).filter(Boolean)
                    : null
                  return (
                    <div className="fiche-fact" key={col}>
                      <dt>{cap(spec.label)}</dt>
                      <dd>{parts ? parts.map((p) => <span className="pill" key={p}>{p}</span>) : format(raw, spec)}</dd>
                    </div>
                  )
                })}
              </dl>
            </article>
          )
        })}
      </div>
      {!sorted.length && <p className="atlas-empty">Aucune fiche pour « {query} ».</p>}
    </section>
  )
}
