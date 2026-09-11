// Génère src/data/region.ts : une carte régionale composite (mer des Caraïbes + Amérique
// centrale), tous les territoires dans UNE SEULE projection/échelle partagée — contrairement à
// shapes.ts où chaque silhouette a son propre cadrage. Sert à situer un territoire sur une petite
// carte, sur les fiches. Même source et même table de correspondance que build-shapes.mjs.
// Usage : node scripts/build-region.mjs
import fs from 'node:fs'
import { MATCH, NE_SOURCE } from './caribbean-territories.mjs'

const OUT = new URL('../src/data/region.ts', import.meta.url)
const VIEW_W = 320, VIEW_H = 220
const PAD = 6
const RDP_EPS = 0.35
const MIN_RING_FRAC = 0.01
const MAX_RINGS = 10
// Sous ce seuil (aire projetée, unités de viewBox²), la forme simplifiée devient illisible à
// cette échelle régionale : on n'affiche qu'un point d'accent (voir RegionMap.tsx).
const DOT_ONLY_AREA = 4

const ringArea = r => {
  let a = 0
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] * r[i][1]) - (r[i][0] * r[j][1])
  return Math.abs(a) / 2
}

// RDP sur une polyligne ouverte
const rdp = (pts, eps) => {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let idx = -1, max = 0
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * dy - (pts[i][1] - a[1]) * dx) / len
    if (d > max) { max = d; idx = i }
  }
  if (max <= eps) return [a, b]
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
}

// RDP sur un anneau fermé : on coupe au sommet le plus loin du sommet 0, on simplifie chaque moitié
const rdpRing = (ring, eps) => {
  const r = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring
  if (r.length < 4) return r
  let far = 0, max = 0
  for (let i = 1; i < r.length; i++) {
    const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1])
    if (d > max) { max = d; far = i }
  }
  const half1 = rdp([...r.slice(0, far + 1)], eps)
  const half2 = rdp([...r.slice(far), r[0]], eps)
  return [...half1.slice(0, -1), ...half2.slice(0, -1)]
}

const gj = await fetch(NE_SOURCE).then((r) => r.json())

// 1) anneaux extérieurs par territoire, en lon/lat
const byTerritory = {}
const report = []
for (const [frName, pred] of Object.entries(MATCH)) {
  const feats = gj.features.filter(f => pred(f.properties))
  if (!feats.length) { report.push(`MANQUE  ${frName}`); continue }
  let rings = []
  for (const f of feats) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of polys) rings.push(poly[0].map(([x, y]) => [x, y]))
  }
  rings.sort((a, b) => ringArea(b) - ringArea(a))
  const maxA = ringArea(rings[0])
  rings = rings.filter(r => ringArea(r) >= maxA * MIN_RING_FRAC).slice(0, MAX_RINGS)
  byTerritory[frName] = rings
}

// 2) UNE projection équirectangulaire partagée par tout le monde (parallèle = latitude moyenne
// de l'ensemble de la zone, pas par territoire)
const allLonLat = Object.values(byTerritory).flat().flat()
const latC = allLonLat.reduce((s, p) => s + p[1], 0) / allLonLat.length
const k = Math.cos(latC * Math.PI / 180)
const proj = {}
for (const [name, rings] of Object.entries(byTerritory)) {
  proj[name] = rings.map(r => r.map(([lon, lat]) => [lon * k, -lat]))
}

// 3) bbox commune -> une seule viewBox
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
for (const rings of Object.values(proj)) for (const p of rings.flat()) {
  minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1])
}
const scale = Math.min((VIEW_W - 2 * PAD) / (maxX - minX), (VIEW_H - 2 * PAD) / (maxY - minY))
const ox = (VIEW_W - (maxX - minX) * scale) / 2 - minX * scale
const oy = (VIEW_H - (maxY - minY) * scale) / 2 - minY * scale
const toView = ([x, y]) => [x * scale + ox, y * scale + oy]

// 4) simplification, centroïde (barycentre de l'anneau principal), seuil "point seul"
const out = {}
for (const [name, rings] of Object.entries(proj)) {
  const viewRings = rings.map(r => r.map(toView))
  const mainArea = ringArea(viewRings[0])
  const simplified = viewRings.map(r => rdpRing(r, RDP_EPS)).filter(r => r.length >= 3 && ringArea(r) >= 0.15)
  const dotOnly = mainArea < DOT_ONLY_AREA || simplified.length === 0
  const d = dotOnly ? '' : simplified.map(r => 'M' + r.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z').join('')
  const main = viewRings[0]
  const cx = main.reduce((s, p) => s + p[0], 0) / main.length
  const cy = main.reduce((s, p) => s + p[1], 0) / main.length
  out[name] = { d, cx: +cx.toFixed(1), cy: +cy.toFixed(1), dotOnly }
  report.push(`${dotOnly ? 'point' : 'ok   '}  ${name.padEnd(34)} aire=${mainArea.toFixed(1)}`)
}

const lines = [
  '// Carte composite des Caraïbes / Amérique centrale — projection PARTAGÉE par tous les',
  '// territoires (contrairement à shapes.ts, cadré individuellement). Générée depuis Natural Earth',
  '// 10m admin-0 map subunits (domaine public). `dotOnly` : le territoire est trop petit pour',
  '// rester lisible à cette échelle — RegionMap.tsx n\'affiche alors que le point d\'accent.',
  '// Régénérer : node scripts/build-region.mjs',
  '',
  'export interface RegionShape { d: string; cx: number; cy: number; dotOnly: boolean }',
  '',
  `export const REGION_VIEWBOX = '0 0 ${VIEW_W} ${VIEW_H}'`,
  '',
  'export const region: Record<string, RegionShape> = {',
  ...Object.entries(out).map(([name, s]) => `  ${JSON.stringify(name)}: ${JSON.stringify(s)},`),
  '}',
  '',
]
fs.writeFileSync(OUT, lines.join('\n'))
console.log(report.join('\n'))
console.log(`\n→ src/data/region.ts  (${(lines.join('\n').length / 1024).toFixed(1)} Ko)`)
