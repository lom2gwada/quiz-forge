import { useState } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import { inferSchema, randomSeed } from '../utils/quizGenerator'
import { playClick } from '../utils/sound'

interface GeneratorPanelProps {
  rows: Row[]
  schema: GenSchema
  onGenerate: (schema: GenSchema, seed: string) => void
  error: string
}

function typeBadges(spec: GenSchema['columns'][string]): string[] {
  const badges = [spec.kind === 'number' ? 'nombre' : 'texte']
  if (spec.isYear) badges.push('année')
  if (spec.multivalueSeparator) badges.push('multi')
  if (spec.unique) badges.push('unique')
  return badges
}

export function GeneratorPanel({ rows, schema, onGenerate, error }: GeneratorPanelProps) {
  const [draft, setDraft] = useState<GenSchema>(schema)
  const [seed, setSeed] = useState(randomSeed())
  const headers = rows.length ? Object.keys(rows[0]) : []

  const patchColumn = (col: string, patch: Partial<GenSchema['columns'][string]>) =>
    setDraft((current) => ({ ...current, columns: { ...current.columns, [col]: { ...current.columns[col], ...patch } } }))

  const changeSubject = (subjectColumn: string) => {
    // Rebâtit le schéma autour de la nouvelle colonne sujet ; les réglages par colonne sont réinitialisés.
    setDraft((current) => ({ ...inferSchema(rows, { subjectColumn }), noun: current.noun, title: current.title }))
  }

  const includedCount = Object.values(draft.columns).filter((c) => c.include).length

  return (
    <section className="generator-panel">
      <h3 className="stats-group-title">Générer un quiz depuis ces données ({rows.length} lignes)</h3>

      <div className="generator-fields">
        <label>Colonne « sujet »
          <select value={draft.subjectColumn} onChange={(event) => changeSubject(event.target.value)}>
            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label>Nom d'un élément
          <input value={draft.noun} onChange={(event) => setDraft((c) => ({ ...c, noun: event.target.value }))} placeholder="pays, ville, film…" />
        </label>
        <label>Titre du quiz
          <input value={draft.title} onChange={(event) => setDraft((c) => ({ ...c, title: event.target.value }))} />
        </label>
      </div>

      <ul className="generator-columns">
        {Object.entries(draft.columns).map(([col, spec]) => (
          <li key={col} className={spec.include ? '' : 'is-excluded'}>
            <label className="generator-column-toggle">
              <input type="checkbox" checked={spec.include} onChange={(event) => patchColumn(col, { include: event.target.checked })} />
              <span className="generator-column-name">{col}</span>
            </label>
            <span className="generator-column-badges">{typeBadges(spec).map((b) => <span key={b} className="generator-badge">{b}</span>)}</span>
            {spec.kind === 'string' && spec.include && (
              <label className="generator-sep">séparateur multivaleur
                <input
                  value={spec.multivalueSeparator ?? ''}
                  maxLength={1}
                  placeholder="|"
                  onChange={(event) => patchColumn(col, { multivalueSeparator: event.target.value || undefined })}
                />
              </label>
            )}
          </li>
        ))}
      </ul>

      <div className="generator-actions">
        <label>Seed
          <input value={seed} onChange={(event) => setSeed(event.target.value)} />
        </label>
        <button type="button" onClick={() => { playClick(); setSeed(randomSeed()) }} className="secondary">Seed aléatoire</button>
        <button type="button" onClick={() => { playClick(); onGenerate(draft, seed) }} disabled={!includedCount}>
          Générer le quiz
        </button>
      </div>
      {!includedCount && <p className="alert" role="alert">Active au moins une colonne.</p>}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  )
}
