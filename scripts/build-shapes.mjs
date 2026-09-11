// Génère src/data/shapes.ts : une silhouette SVG par territoire des Caraïbes, depuis Natural Earth 10m
// admin-0 map subunits (domaine public, https://www.naturalearthdata.com). Chaque forme est cadrée et mise
// à l échelle indépendamment dans une viewBox 100x100, projection équirectangulaire (parallèle = latitude
// du centre). Usage : node scripts/build-shapes.mjs
import fs from 'node:fs'
import { MATCH, NE_SOURCE } from './caribbean-territories.mjs'

const SRC = NE_SOURCE
const OUT = new URL('../src/data/shapes.ts', import.meta.url)
const VIEW = 100
const PAD = 8
const RDP_EPS = 0.35          // en unités de viewBox
const MIN_RING_FRAC = 0.008   // garde les anneaux ≥ 0.8 % de l'aire de l'anneau principal
const MAX_RINGS = 30

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

const gj = await fetch(SRC).then((r) => r.json())
const lines = [
  '// Silhouettes des territoires — générées depuis Natural Earth 10m admin-0 map subunits (domaine public).',
  '// Chaque forme est cadrée et mise à l\'échelle indépendamment dans une viewBox 100×100 (pas d\'échelle commune),',
  '// projection équirectangulaire (parallèle standard = latitude du centre). Régénérer : node scripts/build-shapes.mjs',
  '',
  'export const shapes: Record<string, string> = {',
]
const report = []

for (const [frName, pred] of Object.entries(MATCH)) {
  const feats = gj.features.filter(f => pred(f.properties))
  if (!feats.length) { report.push(`MANQUE  ${frName}`); continue }

  // tous les anneaux extérieurs
  let rings = []
  for (const f of feats) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of polys) rings.push(poly[0].map(([x, y]) => [x, y]))
  }
  rings.sort((a, b) => ringArea(b) - ringArea(a))
  const maxA = ringArea(rings[0])
  rings = rings.filter(r => ringArea(r) >= maxA * MIN_RING_FRAC).slice(0, MAX_RINGS)

  // projection équirectangulaire centrée
  const allPts = rings.flat()
  const latC = allPts.reduce((s, p) => s + p[1], 0) / allPts.length
  const k = Math.cos(latC * Math.PI / 180)
  let proj = rings.map(r => r.map(([lon, lat]) => [lon * k, -lat]))

  // bbox + normalisation vers la viewBox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of proj.flat()) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]) }
  const scale = (VIEW - 2 * PAD) / Math.max(maxX - minX, maxY - minY)
  const ox = (VIEW - (maxX - minX) * scale) / 2, oy = (VIEW - (maxY - minY) * scale) / 2
  proj = proj.map(r => r.map(([x, y]) => [(x - minX) * scale + ox, (y - minY) * scale + oy]))

  // simplification + rejet des miettes
  const simplified = proj
    .map(r => rdpRing(r, RDP_EPS))
    .filter(r => r.length >= 3 && ringArea(r) >= 0.4)

  const d = simplified.map(r => 'M' + r.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z').join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}"><path d="${d}" fill="currentColor"/></svg>`
  lines.push(`  ${JSON.stringify(frName)}: ${JSON.stringify(svg)},`)
  report.push(`ok  ${frName.padEnd(34)} ${simplified.length} anneau(x)  ${(svg.length / 1024).toFixed(1)} Ko`)
}

lines.push('}', '')
const out = lines.join('\n')
fs.writeFileSync(OUT, out)
console.log(report.join('\n'))
console.log(`\n→ src/data/shapes.ts  (${(out.length / 1024).toFixed(1)} Ko)`)
