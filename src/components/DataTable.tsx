import type { Row } from '../utils/quizGenerator'

interface DataTableProps {
  rows: Row[]
}

// Affiche les données source du quiz (le CSV). Lecture seule pour l'instant ;
// l'édition par l'admin (cellules éditables + remontée des changements) viendra ici.
export function DataTable({ rows }: DataTableProps) {
  const headers = rows.length ? Object.keys(rows[0]) : []
  if (!headers.length) return null

  return (
    <section className="data-table-section">
      <h3 className="stats-group-title">Données source — {rows.length} lignes × {headers.length} colonnes</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-num" scope="col">#</th>
              {headers.map((header) => <th key={header} scope="col">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="row-num">{index + 1}</td>
                {headers.map((header) => {
                  const value = row[header] ?? ''
                  return <td key={header} className={value.trim() ? '' : 'is-empty'}>{value.trim() || '—'}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
