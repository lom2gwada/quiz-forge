import { useMemo, useState } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import { Fiche } from './Fiche'

interface AtlasPageProps {
  rows: Row[]
  schema: GenSchema
  shapes?: Record<string, string>
  onBack: () => void
  /** Ouvre la fiche d'une entité en modale (clic sur une carte). */
  onOpenFiche: (name: string) => void
}

/** Grille de fiches, une par entité, dans l'ordre du tri choisi. Filtre + tri génériques
 * depuis le schéma. Cliquer une carte ouvre la fiche en modale. */
export function AtlasPage({ rows, schema, shapes, onBack, onOpenFiche }: AtlasPageProps) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name') // 'name' ou une colonne nombre
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const { subjectColumn, columns } = schema

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
          return (
            <div
              className="fiche-card"
              key={name}
              role="button"
              tabIndex={0}
              onClick={() => onOpenFiche(name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenFiche(name) }
              }}
            >
              <Fiche row={row} schema={schema} shapes={shapes} />
            </div>
          )
        })}
      </div>
      {!sorted.length && <p className="atlas-empty">Aucune fiche pour « {query} ».</p>}
    </section>
  )
}
