import { useState } from 'react'
import { HoverPreview } from './HoverPreview'

/** Cellule d'une colonne image (drapeau…) dans le DataTable : miniature cliquable + aperçu au survol. */
export function CellImagePreview({ src }: { src: string }) {
  const [broken, setBroken] = useState(false)
  const name = decodeURIComponent(src.split('/').pop() ?? 'image').replace(/\.(svg|png|jpe?g|webp|gif)$/i, '').replace(/_/g, ' ')

  if (broken) return <span className="cell-img-fallback">{name}</span>

  return (
    <HoverPreview
      href={src}
      className="cell-img"
      label={`Ouvrir l’image « ${name} » dans un nouvel onglet`}
      trigger={<img className="img-thumb" src={src} alt="" loading="lazy" onError={() => setBroken(true)} />}
      preview={<img src={src} alt="" />}
    />
  )
}
