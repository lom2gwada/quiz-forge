import caribbeanSvg from '../assets/caribbean.svg?raw'

// Fond de carte marine (côtes des Antilles + graticule + rose des vents),
// affiché uniquement sous le thème « carte ». Couleur et opacité via .chart-bg dans styles.css.
export function ChartBackground() {
  return <div className="chart-bg" aria-hidden="true" dangerouslySetInnerHTML={{ __html: caribbeanSvg }} />
}
