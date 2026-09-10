import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { GenSchema, Row } from '../utils/quizGenerator'
import { useT } from '../i18n'
import { Fiche } from './Fiche'

interface FicheModalProps {
  row: Row
  schema: GenSchema
  shapes?: Record<string, string>
  onClose: () => void
}

/** Affiche une fiche dans une modale centrée (portail sur `<body>`) : Échap / clic hors panneau
 * / bouton × pour fermer. */
export function FicheModal({ row, schema, shapes, onClose }: FicheModalProps) {
  const t = useT()
  const closeRef = useRef<HTMLButtonElement>(null)
  const name = row[schema.subjectColumn] ?? ''

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
        <Fiche row={row} schema={schema} shapes={shapes} />
      </div>
    </div>,
    document.body,
  )
}
