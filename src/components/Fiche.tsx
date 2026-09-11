import { useMemo } from 'react'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { getGrammar } from '../i18n/grammar'
import { useLocale, useT } from '../i18n'
import { formatNumericValue } from '../utils/number'
import { HoverPreview } from './HoverPreview'
import { QuestionShape } from './QuestionShape'

interface FicheProps {
  row: Row
  schema: GenSchema
  shapes?: Record<string, string>
  i18n?: DataI18n
}

/** Contenu d'une fiche : en-tête (silhouette + nom + drapeau) et liste des champs non vides,
 * rendu générique depuis le schéma, traduit via le sidecar. Utilisé dans la grille Atlas et la modale. */
export function Fiche({ row, schema, shapes, i18n }: FicheProps) {
  const t = useT()
  const locale = useLocale()
  const data = useMemo(() => makeDatasetI18n(i18n, locale), [i18n, locale])
  const cap = getGrammar(locale).cap

  const { subjectColumn, articleColumn, columns } = schema
  const canonical = row[subjectColumn] ?? '' // valeur FR : clé de `shapes`
  const name = data.value(canonical)
  const article = data.article(canonical, articleColumn ? row[articleColumn] : undefined)
  const imageCol = Object.keys(columns).find((c) => columns[c].include && columns[c].isImage)
  const flag = imageCol && /^https?:\/\//.test((row[imageCol] ?? '').trim()) ? row[imageCol].trim() : null
  const shape = shapes?.[canonical]
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
            ? raw.split(spec.multivalueSeparator).map((s) => data.value(s.trim())).filter(Boolean)
            : null
          let value = spec.kind === 'number' ? raw : data.value(raw)
          if (!parts && spec.kind === 'number') {
            const n = Number(raw.replace(/\s/g, '').replace(',', '.'))
            if (Number.isFinite(n)) value = `${formatNumericValue(n, spec.isYear)}${spec.unit && !spec.isYear ? ` ${data.unit(spec.unit)}` : ''}`
          }
          return (
            <div className="fiche-fact" key={col}>
              <dt>{cap(data.label(spec.label))}</dt>
              <dd>{parts ? parts.map((p) => <span className="pill" key={p}>{p}</span>) : value}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
