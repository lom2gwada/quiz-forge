import type { GenSchema, Row } from '../utils/quizGenerator'
import { formatNumber } from '../utils/number'

interface DataTableProps {
  rows: Row[]
  schema: GenSchema
}

// Affiche les données source du quiz (le CSV). Lecture seule pour l'instant ;
// l'édition par l'admin (cellules éditables + remontée des changements) viendra ici.
export function DataTable({ rows, schema }: DataTableProps) {
  const headers = rows.length ? Object.keys(rows[0]) : []
  if (!headers.length) return null
  const subject = schema.subjectColumn

  // Colonnes nombre (hors années) : on sépare les milliers à l'affichage.
  const separated = new Set(
    headers.filter((h) => schema.columns[h]?.kind === 'number' && !schema.columns[h]?.isYear),
  )
  const display = (header: string, raw: string): string => {
    if (!raw.trim()) return '—'
    if (separated.has(header) && Number.isFinite(Number(raw))) return formatNumber(Number(raw))
    return raw.trim()
  }

  return (
    <section className="data-table-section">
      <h3 className="stats-group-title">Données source — {rows.length} lignes × {headers.length} colonnes</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-num" scope="col">#</th>
              {headers.map((header) => (
                <th key={header} scope="col" className={header === subject ? 'sticky-col' : undefined}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="row-num">{index + 1}</td>
                {headers.map((header) => {
                  const raw = row[header] ?? ''
                  const className = [header === subject ? 'sticky-col' : '', raw.trim() ? '' : 'is-empty'].filter(Boolean).join(' ')
                  return <td key={header} className={className || undefined}>{display(header, raw)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
