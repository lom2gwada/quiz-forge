import { useEffect, useState } from 'react'

/** Cellule d'une colonne image (drapeau…) dans le DataTable : miniature cliquable (ouvre l'original
 * dans un onglet) + aperçu agrandi au survol ou au focus clavier. L'aperçu est en `position: fixed`
 * pour échapper au conteneur scrollable du tableau, et se referme au scroll. */
export function CellImagePreview({ src }: { src: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [broken, setBroken] = useState(false)

  const name = decodeURIComponent(src.split('/').pop() ?? 'image').replace(/\.(svg|png|jpe?g|webp|gif)$/i, '').replace(/_/g, ' ')

  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const W = 240, H = 160
    const top = r.top - H - 6 < 8 ? r.bottom + 6 : r.top - H - 6
    const left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, window.innerWidth - W - 8))
    setPos({ top, left })
  }
  const hide = () => setPos(null)

  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [pos])

  return (
    <a
      className="cell-img"
      href={src}
      target="_blank"
      rel="noreferrer"
      aria-label={`Ouvrir l’image « ${name} » dans un nouvel onglet`}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={hide}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={hide}
    >
      {broken
        ? <span className="cell-img-fallback">{name}</span>
        : <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />}
      {pos && !broken && (
        <span className="cell-img-preview" style={{ top: pos.top, left: pos.left }}>
          <img src={src} alt="" />
        </span>
      )}
    </a>
  )
}
