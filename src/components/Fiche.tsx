import type { GenSchema, Row } from '../utils/quizGenerator'
import { useT } from '../i18n'
import { formatNumericValue } from '../utils/number'
import { HoverPreview } from './HoverPreview'
import { QuestionShape } from './QuestionShape'

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

interface FicheProps {
  row: Row
  schema: GenSchema
  shapes?: Record<string, string>
}

/** Contenu d'une fiche : en-tête (silhouette + nom + drapeau) et liste des champs non vides,
 * rendu générique depuis le schéma. Utilisé dans la grille Atlas et dans la modale. */
export function Fiche({ row, schema, shapes }: FicheProps) {
  const t = useT()
  const { subjectColumn, articleColumn, columns } = schema
  const name = row[subjectColumn] ?? ''
  const article = articleColumn ? (row[articleColumn] ?? '').trim() : ''
  const imageCol = Object.keys(columns).find((c) => columns[c].include && columns[c].isImage)
  const flag = imageCol && /^https?:\/\//.test((row[imageCol] ?? '').trim()) ? row[imageCol].trim() : null
  const shape = shapes?.[name]
  const factCols = Object.entries(columns).filter(
    ([c, s]) => s.include && !s.isImage && c !== subjectColumn && c !== articleColumn,
  )

  return (
    <div className="fiche">
      <header className="fiche-head">
        {shape && (
          <HoverPreview
            className="fiche-shape-wrap"
            label={t('fiche.silhouetteLabel', { name })}
            trigger={<QuestionShape svg={shape} className="fiche-shape" />}
            preview={<QuestionShape svg={shape} />}
          />
        )}
        <h3>{article && <span className="fiche-article">{article} </span>}{name}</h3>
        {flag && (
          <HoverPreview
            href={flag}
            className="fiche-flag-wrap"
            label={t('fiche.flagLabel', { name })}
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
          let value: string = raw
          if (!parts && spec.kind === 'number') {
            const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
            if (Number.isFinite(n)) value = `${formatNumericValue(n, spec.isYear)}${spec.unit && !spec.isYear ? ` ${spec.unit}` : ''}`
          }
          return (
            <div className="fiche-fact" key={col}>
              <dt>{cap(spec.label)}</dt>
              <dd>{parts ? parts.map((p) => <span className="pill" key={p}>{p}</span>) : value}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
