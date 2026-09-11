import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { GenSchema, Row } from '../utils/quizGenerator'
import type { DataI18n } from '../i18n/data'
import { makeDatasetI18n } from '../i18n/dataset'
import { useLocale, useT } from '../i18n'
import { Fiche } from './Fiche'

interface FicheModalProps {
  row: Row
  schema: GenSchema
  shapes?: Record<string, string>
  i18n?: DataI18n
  onClose: () => void
}

/** Affiche une fiche dans une modale centrée (portail sur `<body>`) : Échap / clic hors panneau
 * / bouton × pour fermer. */
export function FicheModal({ row, schema, shapes, i18n, onClose }: FicheModalProps) {
  const t = useT()
  const locale = useLocale()
  const closeRef = useRef<HTMLButtonElement>(null)
  const name = useMemo(() => makeDatasetI18n(i18n, locale).value(row[schema.subjectColumn] ?? ''), [i18n, locale, row, schema.subjectColumn])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel fiche-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('fiche.modalLabel', { name })}
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label={t('fiche.close')}>×</button>
        <Fiche row={row} schema={schema} shapes={shapes} i18n={i18n} />
      </div>
    </div>,
    document.body,
  )
}
