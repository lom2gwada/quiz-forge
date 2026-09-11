import type { RegionShape } from '../data/region'

interface RegionMapProps {
  data: Record<string, RegionShape>
  viewBox: string
  /** Valeur FR canonique du sujet à situer sur la carte. */
  highlight: string
  className?: string
}

/** Petite carte régionale composite : tous les territoires du jeu de données dans une même
 * projection, celui mis en avant coloré (`currentColor`). Un point d'accent marque toujours sa
 * position — seul repère pour les micro-territoires (`dotOnly`), trop petits pour rester
 * lisibles à cette échelle une fois simplifiés. Position du point en % (CSS), pas en unités de
 * viewBox : sa taille reste constante à l'écran, qu'on l'affiche en petite icône ou agrandi. */
export function RegionMap({ data, viewBox, highlight, className }: RegionMapProps) {
  const entry = data[highlight]
  if (!entry) return null
  const [, , vw, vh] = viewBox.split(' ').map(Number)

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
        style={{ left: `${(entry.cx / vw) * 100}%`, top: `${(entry.cy / vh) * 100}%` }}
      />
    </span>
  )
}
