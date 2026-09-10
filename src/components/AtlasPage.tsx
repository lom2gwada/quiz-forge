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
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Une fiche par entité du jeu de données : drapeau + silhouette + tous les champs non vides,
 * rendu générique depuis le schéma (marche pour n'importe quel pack, sans code par sujet). */
export function AtlasPage({ rows, schema, shapes, onBack }: AtlasPageProps) {
  const [query, setQuery] = useState('')
  const { subjectColumn, articleColumn, columns } = schema

  const imageCol = useMemo(
    () => Object.keys(columns).find((c) => columns[c].include && columns[c].isImage),
    [columns],
  )
  const factCols = useMemo(
    () => Object.entries(columns).filter(([c, s]) => s.include && !s.isImage && c !== subjectColumn && c !== articleColumn),
    [columns, subjectColumn, articleColumn],
  )

  const q = query.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => (r[subjectColumn] ?? '').toLowerCase().includes(q)) : rows

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
      <input
        className="atlas-search"
        type="search"
        placeholder="Filtrer par nom…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Filtrer les fiches par nom"
      />
      <div className="atlas-grid">
        {filtered.map((row) => {
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
      {!filtered.length && <p className="atlas-empty">Aucune fiche pour « {query} ».</p>}
    </section>
  )
}
