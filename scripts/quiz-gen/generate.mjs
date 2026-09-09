#!/usr/bin/env node
// Prototype (étape 1) : génère un quiz au format Oliver Quiz à partir d'un CSV + un schéma.
// Types couverts : qcm, qcm inversé, estimation (numeric), classement (ordering), association (matching).
// Usage : node scripts/quiz-gen/generate.mjs [schema.json] [--seed 42] [--out chemin.json]
//
// Le schéma décrit chaque colonne : sa nature (string / number), sa cardinalité (unique),
// les gabarits de phrase, et quels types de questions elle peut alimenter (`ask`).
// C'est le schéma — pas le générateur — qui empêche les questions ambiguës
// (ex. « quel pays utilise le dollar des Caraïbes orientales ? » : 6 réponses => pas de `backward`).

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

// --- RNG déterministe (seed) ------------------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hashStr = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }

// --- args -----------------------------------------------------------------
const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const seedArg = flag('--seed', 'caraibes')
const outArg = flag('--out', 'scripts/quiz-gen/caribbean-quiz.json')
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const schemaPath = resolve(positional[0] ?? 'scripts/quiz-gen/caribbean.schema.json')
const rand = mulberry32(hashStr(String(seedArg)))

const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const sample = (arr, n) => shuffle(arr).slice(0, n)

// --- CSV -----------------------------------------------------------------
function parseCsv(text, delimiter) {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines[0].split(delimiter)
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter)
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  })
}

// --- nombres « ronds » pour les curseurs d'estimation --------------------
function niceStep(span) {
  const raw = span / 40
  const mag = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
}
const roundTo = (v, step) => Math.round(v / step) * step
const fmtNumber = (n) => new Intl.NumberFormat('fr-FR').format(n)

// --- accord des articles français (le point faible d'un générateur) -----
const startsWithVowel = (s) => /^[aeiouyàâäéèêëîïôöûüh]/i.test(s)
function dePhrase(name, article) {
  const art = (article ?? '').trim().toLowerCase()
  if (art === 'les') return `des ${name}`
  if (art === 'le') return `du ${name}`
  if (art === 'la') return `de la ${name}`
  if (art === "l'") return `de l'${name}`
  return startsWithVowel(name) ? `d'${name}` : `de ${name}`
}
function nomPhrase(name, article) {
  const art = (article ?? '').trim().toLowerCase()
  if (!art) return name
  if (art === "l'") return `L'${name}`
  return `${art[0].toUpperCase()}${art.slice(1)} ${name}`
}

// --- placeholders des gabarits -----------------------------------------
const fmtMaybe = (v) => (v != null && /^\d+$/.test(String(v)) ? fmtNumber(Number(v)) : String(v ?? ''))
const humanList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`)
const hasValue = (v) => v != null && String(v).trim() !== ''
function fill(tpl, { subject, article, value, row }) {
  return tpl
    .replaceAll('{de_sujet}', dePhrase(subject ?? '', article))
    .replaceAll('{nom_sujet}', nomPhrase(subject ?? '', article))
    .replaceAll('{sujet}', subject ?? '')
    .replaceAll('{valeur}', String(value ?? ''))
    .replace(/\{ligne\.(\w+)\}/g, (_, col) => fmtMaybe(row?.[col]))
}

// --- génération --------------------------------------------------------
const schema = JSON.parse(await readFile(schemaPath, 'utf8'))
const csvPath = resolve(dirname(schemaPath), schema.dataset)
const rows = parseCsv(await readFile(csvPath, 'utf8'), schema.delimiter ?? ',')
const subjectCol = schema.subject.column
const articleCol = schema.subject.articleColumn
const artOf = (row) => (articleCol ? row[articleCol] : '')
const gen = schema.generation
const questions = []
let counter = 0
const nextId = () => `car-${String(++counter).padStart(2, '0')}`
const seen = new Set()

const base = (difficulty, points, tags) => ({ theme: schema.theme.id, difficulty, points, tags })

for (const [col, def] of Object.entries(schema.columns)) {
  const ask = new Set(def.ask ?? [])
  const sep = def.multivalue
  // Une cellule vide n'alimente aucune question : atomsOf renvoie [] et la ligne est écartée du tirage.
  const atomsOf = (row) => {
    if (!hasValue(row[col])) return []
    return sep ? String(row[col]).split(sep).map((s) => s.trim()).filter(Boolean) : [String(row[col])]
  }
  const domain = [...new Set(rows.flatMap(atomsOf))]
  const rowsWith = rows.filter((row) => atomsOf(row).length > 0)
  const numRowsWith = def.kind === 'number' ? rowsWith.filter((row) => Number.isFinite(Number(row[col]))) : rowsWith

  // ---- QCM direct (mono ou multi-réponses selon la cardinalité de la cellule) ----
  if (ask.has('qcm') && def.templates?.forward) {
    const cfg = gen.qcm
    const mcfg = gen.qcm_multi ?? cfg
    // priorise les lignes multivaluées pour qu'elles apparaissent dans le tirage
    const forced = sep ? rowsWith.filter((r) => atomsOf(r).length > 1).slice(0, mcfg.perColumn ?? 3) : []
    const picks = shuffle([...forced, ...sample(rowsWith.filter((r) => !forced.includes(r)), cfg.perColumn)])
    for (const row of picks) {
      const key = `qcm:${col}:${row[subjectCol]}`
      if (seen.has(key)) continue; seen.add(key)
      const corrects = atomsOf(row)
      const ctx = { subject: row[subjectCol], article: artOf(row), row }

      if (corrects.length > 1) {
        const pool = domain.filter((v) => !corrects.includes(v))
        const nDist = Math.min((mcfg.options ?? 5) - corrects.length, pool.length)
        if (nDist < 1) continue
        const options = shuffle([...corrects, ...sample(pool, nDist)])
        questions.push({
          id: nextId(), type: 'qcm', ...base(mcfg.difficulty, mcfg.points, [col]),
          question: fill(def.templates.forwardMulti ?? def.templates.forward, ctx),
          explanation: fill(def.explanationMulti ?? def.explanation, { ...ctx, value: humanList(corrects) }),
          content: { multiple: true, answers: options.map((label, i) => ({ id: 'abcde'[i], label, isCorrect: corrects.includes(label) })) },
        })
        continue
      }

      const correct = corrects[0]
      const distractors = sample(domain.filter((v) => v !== correct), cfg.choices - 1)
      if (distractors.length < cfg.choices - 1) continue
      const answers = shuffle([correct, ...distractors]).map((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct }))
      questions.push({
        id: nextId(), type: 'qcm', ...base(cfg.difficulty, cfg.points, [col]),
        question: fill(def.templates.forward, ctx),
        explanation: fill(def.explanation, { ...ctx, value: correct }),
        content: { multiple: false, answers },
      })
    }
  }

  // ---- QCM inversé (colonnes uniques seulement) ----
  if (ask.has('qcm_backward') && def.templates?.backward && def.unique) {
    const cfg = gen.qcm_backward
    for (const row of sample(rowsWith, cfg.perColumn)) {
      const correct = row[subjectCol]
      const distractors = sample(rows.filter((r) => r !== row).map((r) => r[subjectCol]), cfg.choices - 1)
      const answers = shuffle([correct, ...distractors]).map((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct }))
      questions.push({
        id: nextId(), type: 'qcm', ...base(cfg.difficulty, cfg.points, [col]),
        question: fill(def.templates.backward, { value: row[col] }),
        explanation: fill(def.explanation, { subject: correct, article: artOf(row), value: row[col], row }),
        content: { multiple: false, answers },
      })
    }
  }

  // ---- Estimation (numeric) ----
  if (ask.has('estimate') && def.kind === 'number') {
    const cfg = gen.estimate
    for (const row of sample(numRowsWith, cfg.perColumn)) {
      const target = Number(row[col])
      let min, max, step, tolerance
      if (def.isYear) {
        min = target - 40; max = Math.min(2000, target + 40); step = 1; tolerance = 4
      } else {
        step = niceStep(target * 2)
        min = Math.max(0, roundTo(target * 0.3, step))
        max = roundTo(target * 2.2, step)
        tolerance = Math.max(step, roundTo(target * 0.12, step))
      }
      const ctx = { subject: row[subjectCol], article: artOf(row), row }
      questions.push({
        id: nextId(), type: 'numeric', ...base(cfg.difficulty, cfg.points, [col]),
        question: fill(def.estimateTemplate ?? `Estimez ${def.label} {de_sujet}.`, ctx),
        explanation: fill(def.explanation, { ...ctx, value: def.isYear ? String(target) : fmtNumber(target) }),
        content: { min, max, step, target, tolerance, ...(def.unit && !def.isYear ? { unit: def.unit } : {}) },
      })
    }
  }

  // ---- Classement (ordering) ----
  // Une seule ligne par valeur distincte : deux ex æquo rendraient l'ordre attendu ambigu.
  const orderPool = def.order
    ? [...new Map(shuffle(numRowsWith).map((r) => [Number(r[col]), r])).values()]
    : []
  if (ask.has('order') && def.order && orderPool.length >= 3) {
    const cfg = gen.order
    const n = Math.min(cfg.items, orderPool.length)
    for (let k = 0; k < cfg.perColumn; k++) {
      const chosen = sample(orderPool, n)
      const sorted = [...chosen].sort((a, b) =>
        def.order.direction === 'asc' ? Number(a[col]) - Number(b[col]) : Number(b[col]) - Number(a[col]))
      const itemCol = def.order.itemFrom ?? subjectCol
      const idOf = (r) => `o-${hashStr(r[subjectCol] + col)}`
      const items = chosen.map((r) => ({ id: idOf(r), label: r[itemCol] }))
      questions.push({
        id: nextId(), type: 'ordering', ...base(cfg.difficulty, cfg.points, [col]),
        question: def.order.question,
        explanation: sorted.map((r) => `${r[itemCol]} (${fmtNumber(Number(r[col]))}${def.unit && !def.isYear ? ' ' + def.unit : ''})`).join(' › '),
        content: { items: shuffle(items), correctOrder: sorted.map(idOf) },
      })
    }
  }

  // ---- Association (matching) ----
  if (ask.has('matching') && def.unique && rowsWith.length >= 3) {
    const cfg = gen.matching
    const chosen = sample(rowsWith, Math.min(cfg.items, rowsWith.length))
    const left = chosen.map((r) => ({ id: `l-${hashStr(r[subjectCol])}`, label: r[subjectCol] }))
    const right = shuffle(chosen.map((r) => ({ id: `r-${hashStr(r[col])}`, label: r[col] })))
    const correctPairs = Object.fromEntries(chosen.map((r) => [`l-${hashStr(r[subjectCol])}`, `r-${hashStr(r[col])}`]))
    questions.push({
      id: nextId(), type: 'matching', ...base(cfg.difficulty, cfg.points, [col]),
      question: `Associez chaque ${schema.subject.noun ?? 'élément'} à ${def.matchingLabel ?? def.label}.`,
      explanation: chosen.map((r) => `${r[subjectCol]} → ${r[col]}`).join(' · '),
      content: { left, right, correctPairs },
    })
  }
}

const quiz = {
  version: '1.0',
  metadata: { ...schema.metadata, createdAt: new Date().toISOString().slice(0, 10), seed: String(seedArg) },
  themes: [schema.theme],
  questions: shuffle(questions),
}

await writeFile(resolve(outArg), JSON.stringify(quiz, null, 2) + '\n', 'utf8')
console.log(`${quiz.questions.length} questions générées (seed « ${seedArg} ») → ${outArg}`)
console.log('Répartition :', quiz.questions.reduce((m, q) => ((m[q.type] = (m[q.type] ?? 0) + 1), m), {}))
