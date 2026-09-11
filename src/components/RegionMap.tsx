import type { RegionShape } from '../data/region'

interface RegionMapProps {
  data: Record<string, RegionShape>
  viewBox: string
  /** Valeur FR canonique du sujet à situer sur la carte. */
  highlight: string
  className?: string
  /** Nom du territoire + de sa capitale, affichés en overlay — uniquement en version détaillée
   * (la petite icône reste sans texte : le nom du territoire est déjà juste à côté sur la fiche). */
  label?: { territory: string; capital?: string }
}

/** Petite carte régionale composite : tous les territoires du jeu de données dans une même
 * projection, celui mis en avant coloré (`currentColor`). Un point d'accent marque toujours sa
 * position — seul repère pour les micro-territoires (`dotOnly`), trop petits pour rester
 * lisibles à cette échelle une fois simplifiés. Position du point en % (CSS), pas en unités de
 * viewBox : sa taille reste constante à l'écran, qu'on l'affiche en petite icône ou agrandi. */
export function RegionMap({ data, viewBox, highlight, className, label }: RegionMapProps) {
  const entry = data[highlight]
  if (!entry) return null
  const [, , vw, vh] = viewBox.split(' ').map(Number)
  const left = (entry.cx / vw) * 100
  const top = (entry.cy / vh) * 100
  // Étiquette de capitale : au-dessus du point s'il est bas sur la carte (sinon elle dépasserait),
  // en dessous sinon.
  const capitalAbove = top > 62

  return (
    <span className={className ? `region-map ${className}` : 'region-map'}>
      <svg viewBox={viewBox} aria-hidden="true">
        <g className="region-land">
          {Object.entries(data).map(([name, shape]) => shape.d && (
            <path key={name} d={shape.d} className={name === highlight ? 'region-hl' : undefined} />
          ))}
        </g>
      </svg>
      <span
        className={entry.dotOnly ? 'region-dot region-dot-solo' : 'region-dot'}
        style={{ left: `${left}%`, top: `${top}%` }}
      />
      {label && (
        <>
          <span className="region-title">{label.territory}</span>
          {label.capital && (
            <span
              className={capitalAbove ? 'region-capital region-capital-above' : 'region-capital region-capital-below'}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {label.capital}
            </span>
          )}
        </>
      )}
    </span>
  )
}
