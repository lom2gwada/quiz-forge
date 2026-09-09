import type { AnswerOption, MatchingItem, OrderingItem, Question, Quiz } from '../types/quiz'
import { formatNumber, formatNumericValue } from './number'

// Génère un quiz jouable à partir de lignes tabulaires (un CSV, plus tard une base de données)
// et d'un schéma décrivant les colonnes. Tout est pur et tourne dans le navigateur.

export type Row = Record<string, string>

export interface ColumnSpec {
  include: boolean
  kind: 'string' | 'number'
  unique: boolean
  isYear: boolean
  /** La colonne contient des URLs d'images (ex. drapeaux) → questions « quelle entité ? » sur l'image. */
  isImage?: boolean
  multivalueSeparator?: string
  label: string
  unit?: string
}

export interface GenSchema {
  subjectColumn: string
  articleColumn?: string
  noun: string
  title: string
  columns: Record<string, ColumnSpec>
}

// --- RNG déterministe (seed) ------------------------------------------------
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(value: string): number {
  let h = 2166136261
  for (const char of value) {
    h ^= char.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// --- CSV : détection du délimiteur + champs entre guillemets ---------------
export function parseCsv(text: string): Row[] {
  const clean = text.replace(/^﻿/, '')
  const headerLine = clean.slice(0, clean.search(/\r?\n|$/))
  const delimiter = [';', '\t', ',']
    .map((d) => ({ d, count: headerLine.split(d).length }))
    .sort((a, b) => b.count - a.count)[0].d

  const rows: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i]
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') { field += '"'; i += 1 }
        else inQuotes = false
      } else field += char
      continue
    }
    if (char === '"') { inQuotes = true; continue }
    if (char === delimiter) { record.push(field); field = ''; continue }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[i + 1] === '\n') i += 1
      record.push(field)
      if (record.length > 1 || record[0] !== '') rows.push(record)
      record = []
      field = ''
      continue
    }
    field += char
  }
  if (field !== '' || record.length) {
    record.push(field)
    if (record.length > 1 || record[0] !== '') rows.push(record)
  }
  if (!rows.length) return []

  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()])),
  )
}

// --- Inférence du schéma --------------------------------------------------
const hasValue = (v: string | undefined): boolean => v != null && String(v).trim() !== ''
const asNumber = (v: string): number => Number(String(v).replace(/[\s ]/g, '').replace(',', '.'))
// Un `+` en tête (indicatif téléphonique « +1 268 », « +590 ») n'est pas une quantité :
// on l'exclut du kind « number » pour éviter estimation / classement absurdes.
const isNumeric = (v: string): boolean => hasValue(v) && !/^\s*\+/.test(v) && Number.isFinite(asNumber(v))
const isUrl = (v: string): boolean => /^https?:\/\//i.test(v.trim())
const looksLikeImage = (v: string): boolean => /\.(svg|png|jpe?g|webp|gif|avif)(\?|$)/i.test(v) || /filepath/i.test(v)
const IMAGE_HEADER = /drapeau|flag|image|photo|logo|blason|armoiries|embl/i

const ARTICLE_VALUES = new Set(['', 'le', 'la', 'les', "l'"])
const SUBJECT_HINTS = ['nom', 'name', 'pays', 'sujet', 'titre', 'title', 'ville', 'city', 'entité', 'entite']
const UNIT_SUFFIXES: Array<[RegExp, string]> = [
  [/_hab_km2$/i, 'hab/km²'],
  [/_mds_usd$/i, 'Mds $'],
  [/_km2$/i, 'km²'],
  [/_m$/i, 'm'],
  [/_pct$/i, '%'],
  [/_pourcent$/i, '%'],
]

function labelOf(header: string): { label: string; unit?: string } {
  let unit: string | undefined
  let base = header
  for (const [re, u] of UNIT_SUFFIXES) {
    if (re.test(base)) { unit = u; base = base.replace(re, ''); break }
  }
  return { label: base.replace(/[_-]+/g, ' ').trim().toLowerCase(), unit }
}

export function inferSchema(rows: Row[], opts?: { subjectColumn?: string }): GenSchema {
  const headers = rows.length ? Object.keys(rows[0]) : []

  const articleColumn = headers.find(
    (h) => h.toLowerCase() === 'article' && rows.every((r) => ARTICLE_VALUES.has((r[h] ?? '').trim().toLowerCase())),
  )

  const isStringCol = (h: string): boolean => {
    const filled = rows.map((r) => r[h] ?? '').filter(hasValue)
    return filled.length > 0 && !filled.every(isNumeric) && !filled.every(isUrl)
  }
  const subjectColumn =
    (opts?.subjectColumn && headers.includes(opts.subjectColumn) ? opts.subjectColumn : undefined) ??
    headers.find((h) => SUBJECT_HINTS.includes(h.toLowerCase())) ??
    headers.find((h) => h !== articleColumn && isStringCol(h)) ??
    headers.find((h) => h !== articleColumn) ??
    headers[0] ??
    'sujet'

  const columns: Record<string, ColumnSpec> = {}
  for (const header of headers) {
    if (header === subjectColumn || header === articleColumn) continue
    const values = rows.map((r) => r[header] ?? '')
    const filled = values.filter(hasValue)
    const { label, unit } = labelOf(header)
    const kind: ColumnSpec['kind'] = filled.length > 0 && filled.every(isNumeric) ? 'number' : 'string'
    const isYear =
      kind === 'number' &&
      filled.every((v) => Number.isInteger(asNumber(v)) && asNumber(v) >= 1000 && asNumber(v) <= 2100)
    const multivalueSeparator = kind === 'string' && filled.some((v) => v.includes('|')) ? '|' : undefined
    const atoms = filled.flatMap((v) =>
      multivalueSeparator ? v.split(multivalueSeparator).map((s) => s.trim()).filter(Boolean) : [v],
    )
    const unique = kind === 'string' && !multivalueSeparator && new Set(atoms).size === atoms.length && atoms.length > 0
    const allUrls = filled.length > 0 && filled.every(isUrl)
    const isImage = allUrls && (filled.some(looksLikeImage) || IMAGE_HEADER.test(header))
    const include = filled.length > 0 && (!allUrls || isImage)
    columns[header] = { include, kind, unique, isYear, isImage, multivalueSeparator, label, unit }
  }

  return {
    subjectColumn,
    articleColumn,
    noun: subjectColumn.replace(/[_-]+/g, ' ').trim().toLowerCase() || 'élément',
    title: `Quiz — ${subjectColumn}`,
    columns,
  }
}

// --- Helpers de génération ----------------------------------------------
function niceStep(span: number): number {
  const raw = span / 40
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
}
const roundTo = (v: number, step: number): number => Math.round(v / step) * step
const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)
const humanList = (items: string[]): string =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`

const startsWithVowel = (s: string): boolean => /^[aeiouyàâäéèêëîïôöûüh]/i.test(s)
function dePhrase(name: string, article?: string): string {
  const art = (article ?? '').trim().toLowerCase()
  if (art === 'les') return `des ${name}`
  if (art === 'le') return `du ${name}`
  if (art === 'la') return `de la ${name}`
  if (art === "l'") return `de l'${name}`
  return startsWithVowel(name) ? `d'${name}` : `de ${name}`
}

// --- Génération --------------------------------------------------------
// Pas de quota : chaque colonne produit toutes les questions possibles.
// `choices`/`options` = nombre d'items affichés, `groupSize` = taille d'un
// classement / d'une association. Le tirage aléatoire se fait à la partie.
const CFG = {
  qcm: { choices: 3, points: 1, difficulty: 'easy' as const },
  qcmMulti: { options: 5, points: 2, difficulty: 'medium' as const },
  qcmBackward: { choices: 3, points: 2, difficulty: 'medium' as const },
  image: { choices: 3, points: 2, difficulty: 'medium' as const },
  boolean: { points: 1, difficulty: 'easy' as const },
  cloze: { points: 3, difficulty: 'hard' as const },
  estimate: { points: 2, difficulty: 'medium' as const },
  order: { groupSize: 4, points: 3, difficulty: 'hard' as const },
  matching: { groupSize: 4, points: 2, difficulty: 'medium' as const },
}

export function generateQuiz(rows: Row[], schema: GenSchema, opts: { seed: string }): Quiz {
  const rand = mulberry32(hashStr(opts.seed))
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const sample = <T>(arr: T[], n: number): T[] => shuffle(arr).slice(0, n)

  const { subjectColumn, articleColumn, noun } = schema
  const nameOf = (row: Row): string => row[subjectColumn] ?? ''

  // Groupes aléatoires de `size` lignes, qui peuvent se recouvrir d'une question à l'autre.
  // ~une question par ligne du pool ; les doublons exacts (petits jeux de données) sont écartés.
  const overlapGroups = (pool: Row[], size: number): Row[][] => {
    const n = Math.min(size, pool.length)
    if (n < 3) return []
    const groups: Row[][] = []
    const seen = new Set<string>()
    for (let i = 0; i < pool.length; i += 1) {
      const group = sample(pool, n)
      const key = group.map(nameOf).sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      groups.push(group)
    }
    return groups
  }
  const artOf = (row: Row): string => (articleColumn ? row[articleColumn] ?? '' : '')
  const de = (row: Row): string => dePhrase(nameOf(row), artOf(row))

  const questions: Question[] = []
  const usedIds = new Set<string>()
  // Identité STABLE d'une question : dérivée de son contenu (catégorie + variante + sujet·s),
  // pas de l'ordre de génération. Une même question garde donc son id d'une régénération à
  // l'autre — c'est ce qui permet à l'historique « questions à retravailler » de la retrouver.
  // Séparateur + sel = octets de contrôle (0x01 / 0x02) : absents des données réelles.
  // Deux hachages 32 bits ≈ digest 64 bits, collision quasi impossible sur un vrai jeu.
  const qid = (parts: string[]): string => {
    const key = parts.join('')
    const base = `q${hashStr(key).toString(36)}${hashStr(key + '').toString(36)}`
    let id = base
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`
    usedIds.add(id)
    return id
  }

  for (const [col, spec] of Object.entries(schema.columns)) {
    if (!spec.include) continue
    // Une catégorie par colonne : le joueur filtre « capitale », « population »… depuis l'accueil.
    const categoryId = col
    const sep = spec.multivalueSeparator
    const atomsOf = (row: Row): string[] => {
      if (!hasValue(row[col])) return []
      return sep ? String(row[col]).split(sep).map((s) => s.trim()).filter(Boolean) : [String(row[col])]
    }
    const domain = [...new Set(rows.flatMap(atomsOf))]
    const rowsWith = rows.filter((row) => atomsOf(row).length > 0)
    const numRowsWith = spec.kind === 'number' ? rowsWith.filter((row) => Number.isFinite(asNumber(row[col]))) : rowsWith
    const Label = capitalize(spec.label)

    // ---- Colonne image (ex. drapeaux) : identifier l'entité d'après l'image ----
    if (spec.isImage && spec.unique) {
      for (const row of rowsWith) {
        const correct = nameOf(row)
        const distractors = sample(rows.filter((r) => r !== row).map(nameOf), CFG.image.choices - 1)
        if (distractors.length < CFG.image.choices - 1) continue
        questions.push({
          id: qid([col, 'image', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.image.difficulty, points: CFG.image.points, tags: [col],
          question: `Quel ${noun} ce ${spec.label} représente-t-il ?`,
          topic: `${Label} ${de(row)}`,
          explanation: `Ce ${spec.label} est celui ${de(row)}.`,
          imageUrl: row[col],
          imageAlt: `Un ${spec.label}.`,
          content: {
            multiple: false,
            answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
          },
        })
      }
    }

    // ---- Colonne texte : QCM + Vrai/Faux + texte à trous, une série par ligne ----
    if (spec.kind === 'string' && !spec.isImage) {
      for (const row of rowsWith) {
        const corrects = atomsOf(row)
        if (!corrects.length) continue
        const about = `${Label} ${de(row)}`
        const fact = `${about} : ${humanList(corrects)}.`

        if (corrects.length > 1) {
          const pool = domain.filter((v) => !corrects.includes(v))
          const nDist = Math.min(CFG.qcmMulti.options - corrects.length, pool.length)
          if (nDist >= 1) {
            const options = shuffle([...corrects, ...sample(pool, nDist)])
            questions.push({
              id: qid([col, 'qcm-multi', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcmMulti.difficulty, points: CFG.qcmMulti.points, tags: [col],
              question: `${Label} ${de(row)} ? (plusieurs réponses)`,
              topic: about,
              explanation: fact,
              content: {
                multiple: true,
                answers: options.map<AnswerOption>((label, i) => ({ id: 'abcde'[i], label, isCorrect: corrects.includes(label) })),
              },
            })
          }
        } else {
          const correct = corrects[0]
          const distractors = sample(domain.filter((v) => v !== correct), CFG.qcm.choices - 1)
          if (distractors.length >= CFG.qcm.choices - 1) {
            questions.push({
              id: qid([col, 'qcm', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcm.difficulty, points: CFG.qcm.points, tags: [col],
              question: `${Label} ${de(row)} ?`,
              topic: about,
              explanation: `${about} : ${correct}.`,
              content: {
                multiple: false,
                answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
              },
            })
          }
        }

        // Vrai/Faux : la vraie valeur (isTrue) ou une valeur empruntée à une autre ligne
        const showTrue = rand() < 0.5
        const shown = showTrue
          ? corrects[Math.floor(rand() * corrects.length)]
          : sample(domain.filter((v) => !corrects.includes(v)), 1)[0]
        if (shown) {
          questions.push({
            id: qid([col, 'boolean', nameOf(row)]), type: 'boolean', category: categoryId, difficulty: CFG.boolean.difficulty, points: CFG.boolean.points, tags: [col],
            question: `${Label} ${de(row)} : ${shown}.`,
            topic: about,
            explanation: `${showTrue ? 'Vrai' : 'Faux'}. ${fact}`,
            content: { isTrue: showTrue },
          })
        }

        // Texte à trous : on masque la valeur
        questions.push({
          id: qid([col, 'cloze', nameOf(row)]), type: 'cloze', category: categoryId, difficulty: CFG.cloze.difficulty, points: CFG.cloze.points, tags: [col],
          question: `${Label} ${de(row)} : ___`,
          topic: about,
          explanation: fact,
          content: { expectedAnswers: corrects, caseSensitive: false },
        })
      }
    }

    // ---- QCM inversé (colonnes uniques) : une question par ligne ----
    if (spec.kind === 'string' && !spec.isImage && spec.unique && rows.length > CFG.qcmBackward.choices) {
      for (const row of rowsWith) {
        const correct = nameOf(row)
        const distractors = sample(rows.filter((r) => r !== row).map(nameOf), CFG.qcmBackward.choices - 1)
        questions.push({
          id: qid([col, 'qcm-inverse', nameOf(row)]), type: 'qcm', category: categoryId, difficulty: CFG.qcmBackward.difficulty, points: CFG.qcmBackward.points, tags: [col],
          question: `Quel ${noun} a pour ${spec.label} « ${row[col]} » ?`,
          topic: `${Label} ${de(row)}`,
          explanation: `${Label} ${de(row)} : ${row[col]}.`,
          content: {
            multiple: false,
            answers: shuffle([correct, ...distractors]).map<AnswerOption>((label, i) => ({ id: 'abcd'[i], label, isCorrect: label === correct })),
          },
        })
      }
    }

    // ---- Estimation (numeric) : une question par ligne ----
    if (spec.kind === 'number') {
      for (const row of numRowsWith) {
        const target = asNumber(row[col])
        let min: number, max: number, step: number, tolerance: number
        if (spec.isYear) {
          min = target - 40; max = Math.min(2000, target + 40); step = 1; tolerance = 4
        } else {
          step = niceStep(target * 2)
          min = Math.max(0, roundTo(target * 0.3, step))
          max = roundTo(target * 2.2, step)
          tolerance = Math.max(step, roundTo(target * 0.12, step))
        }
        questions.push({
          id: qid([col, 'numeric', nameOf(row)]), type: 'numeric', category: categoryId, difficulty: CFG.estimate.difficulty, points: CFG.estimate.points, tags: [col],
          question: spec.isYear
            ? `En quelle année : ${spec.label} ${de(row)} ?`
            : `Estimez : ${spec.label} ${de(row)}${spec.unit ? ` (en ${spec.unit})` : ''}.`,
          topic: `${Label} ${de(row)}`,
          explanation: `${Label} ${de(row)} : ${formatNumericValue(target, spec.isYear)}${spec.unit && !spec.isYear ? ` ${spec.unit}` : ''}.`,
          content: { min, max, step, target, tolerance, isYear: spec.isYear, ...(spec.unit && !spec.isYear ? { unit: spec.unit } : {}) },
        })
      }
    }

    // ---- Classement (ordering) : groupes aléatoires qui se recouvrent ----
    // Une seule ligne par valeur distincte au départ (deux ex æquo rendraient l'ordre attendu ambigu).
    if (spec.kind === 'number') {
      const distinct = [...new Map(shuffle(numRowsWith).map((r) => [asNumber(r[col]), r] as const)).values()]
      const direction: 'asc' | 'desc' = spec.isYear ? 'asc' : 'desc'
      const idOf = (r: Row): string => `o-${hashStr(nameOf(r) + col)}`
      for (const group of overlapGroups(distinct, CFG.order.groupSize)) {
        const members = [...group].map(nameOf).sort()
        const sorted = [...group].sort((a, b) =>
          direction === 'asc' ? asNumber(a[col]) - asNumber(b[col]) : asNumber(b[col]) - asNumber(a[col]))
        questions.push({
          id: qid([col, 'ordering', ...members]), type: 'ordering', category: categoryId, difficulty: CFG.order.difficulty, points: CFG.order.points, tags: [col],
          question: `Classez ces ${noun}s par ${spec.label} ${direction === 'asc' ? 'croissante' : 'décroissante'}.`,
          topic: `${Label} : ${members.join(', ')}`,
          explanation: sorted
            .map((r) => `${nameOf(r)} (${formatNumericValue(asNumber(r[col]), spec.isYear)}${spec.unit && !spec.isYear ? ` ${spec.unit}` : ''})`)
            .join(' › '),
          content: {
            items: shuffle(group).map<OrderingItem>((r) => ({ id: idOf(r), label: nameOf(r) })),
            correctOrder: sorted.map(idOf),
          },
        })
      }
    }

    // ---- Association (matching) : groupes aléatoires qui se recouvrent ----
    if (spec.kind === 'string' && !spec.isImage && spec.unique) {
      const leftId = (r: Row): string => `l-${hashStr(nameOf(r))}`
      const rightId = (r: Row): string => `r-${hashStr(r[col])}`
      for (const group of overlapGroups(rowsWith, CFG.matching.groupSize)) {
        const members = [...group].map(nameOf).sort()
        questions.push({
          id: qid([col, 'matching', ...members]), type: 'matching', category: categoryId, difficulty: CFG.matching.difficulty, points: CFG.matching.points, tags: [col],
          question: `Associez chaque ${noun} à : ${spec.label}.`,
          topic: `${Label} : ${members.join(', ')}`,
          explanation: group.map((r) => `${nameOf(r)} → ${r[col]}`).join(' · '),
          content: {
            left: group.map<MatchingItem>((r) => ({ id: leftId(r), label: nameOf(r) })),
            right: shuffle(group).map<MatchingItem>((r) => ({ id: rightId(r), label: r[col] })),
            correctPairs: Object.fromEntries(group.map((r) => [leftId(r), rightId(r)])),
          },
        })
      }
    }
  }

  // Les catégories proposées au joueur = les colonnes qui ont effectivement produit des questions,
  // dans l'ordre du tableau source.
  const used = new Set(questions.map((q) => q.category))
  const categories = Object.entries(schema.columns)
    .filter(([col]) => used.has(col))
    .map(([col, spec]) => ({ id: col, label: capitalize(spec.label) }))

  return {
    version: '1.0',
    metadata: {
      title: schema.title,
      author: 'Quiz Forge',
      createdAt: new Date().toISOString().slice(0, 10),
      description: `${formatNumber(questions.length)} questions générées à partir de ${formatNumber(rows.length)} ${noun}s (seed « ${opts.seed} »).`,
    },
    categories,
    questions: shuffle(questions),
  }
}

export const randomSeed = (): string => Math.random().toString(36).slice(2, 8)
