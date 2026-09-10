# Plan : internationalisation de quiz-forge

> **Statut** : phases 0–6 faites (0–2 le 2026-09-10, 3–6 le 2026-09-11).
> `SUPPORTED_LOCALES = ['fr', 'en', 'es', 'nl', 'ht']`. fr/en relus ; **es/nl/ht à faire relire
> par des locuteurs natifs** (kreyòl = créole haïtien, orthographe IPN). Chaque langue =
> `messages/<loc>` + `grammar/<loc>` + `templates/<loc>` + colonne `<loc>` dans
> `caribbean.i18n.ts` (+ `nouns.<loc>` dans `App`). `DataI18n` a gagné `units` (« Mds $ » →
> « bn $ »…). `Question.subjectLabel` (nom traduit) traverse `parseQuiz`. FR verrouillé par les
> tests. Restes connus : titre du quiz gardé FR (clé d'historique stable) ; fiches / tableau
> source / panneau générateur affichent encore les données FR. Plan rédigé le 2026-09-10.
> Langues visées : français (défaut + source de vérité), puis **anglais**, **espagnol**,
> **néerlandais** (Aruba / Curaçao / Sint Maarten), **créole**. L'architecture reste
> **ouverte à n'importe quelle locale** — ajouter une langue ne touche pas le cœur.
>
> ⚠️ **Créole** : il n'y a pas *un* créole. Choix à faire avec l'utilisateur (créole
> guadeloupéen — le jeu de données est caribéen et c'est sa région — vs haïtien, vs
> martiniquais) **et** l'orthographe (GEREC vs standard haïtien). L'article y est **postposé**
> (« kapital-la ») → `grammar.of` gère, mais certains gabarits diffèrent davantage. À traiter
> en dernier, avec relecture d'un locuteur natif.
> **Néerlandais** : grammaire simple (article `de`/`het`, pas de contraction) — surtout du contenu.

Voir aussi [`architecture-packs.md`](architecture-packs.md) — l'i18n et la vision « packs »
convergent : à terme, une locale est une facette du pack (templates + grammaire + traductions).

---

## 1. Périmètre

i18n **complète** : ce que voit l'utilisateur est entièrement dans sa langue.

| Couche | Contenu | Effort |
| --- | --- | --- |
| **A. UI** | boutons, titres, libellés, messages (~120 chaînes) | ~1 j |
| **B. Génération** | formulations des questions (aujourd'hui français + grammaire FR câblée) | ~1 j |
| **C. Données** | valeurs du CSV (« La Havane », « Jamaïque », « le peso cubain », colonne `article`) + libellés de colonnes | mécanisme ~1 h, **contenu ≈ 600 traductions** par langue |

**Principe** : le CSV français reste la **source de vérité**. Chaque locale est une couche de
traduction par-dessus, avec repli systématique sur le français. Une traduction manquante ne
casse jamais — elle retombe sur le FR (+ warning en dev).

---

## 2. Le socle : la notion de `Locale`

```ts
// src/i18n/locale.ts
export type Locale = string                       // 'fr' | 'en' | 'es' | … (ouvert, pas d'union fermée)
export const DEFAULT_LOCALE = 'fr'
export const SUPPORTED_LOCALES: Locale[] = ['fr']  // on ajoute 'en', 'es'… au fur et à mesure du câblage

/** profil → préfixe de navigator.language → défaut. */
export function resolveLocale(profileLocale?: string): Locale
```

- **Stockage** : `Profile.locale` (nouveau champ, à côté de `theme`) — même plomberie que le
  thème (`utils/profile.ts` `fetchProfile`/`saveProfile`, `ProfilePage`, `App`).
- **Application** : `document.documentElement.lang = locale` (analogue de `applyTheme`).
- **Sélecteur** : un `<select>` de langue dans `ProfilePage`, à côté du choix de thème,
  limité à `SUPPORTED_LOCALES`.

---

## 3. Couche A — chaînes d'UI

```
src/i18n/
  locale.ts
  index.ts            LocaleProvider (contexte) + hook useT() → t(key, params?)
  messages/
    fr.ts             SOURCE : Record<string, string>, clés pointées ('start.play', 'atlas.title'…)
    en.ts             Record<MessageKey, string>  (MessageKey = keyof typeof fr → clé manquante = erreur TS)
    es.ts             idem
```

- `t('result.viewFiche', { name: 'Cuba' })` → interpolation `{name}`. Pluriel géré par des
  clés distinctes (`x.one` / `x.other`) ou un helper `plural()`.
- Clé absente dans une locale ≠ fr → repli sur `fr` + `console.warn` en dev.
- `<LocaleProvider locale={locale}>` enveloppe `<App>`. Migration : chaque littéral FR des
  composants → `t('…')`. Mécanique, ~120 remplacements.
- **Nombres** : `formatNumber` (`src/utils/number.ts`) devient locale-aware — `new
  Intl.NumberFormat(locale)` au lieu de `'fr-FR'` figé. Garder le remplacement U+202F → U+00A0
  (fine insécable illisible) en le généralisant. `formatNumber` prend la locale en argument
  ou lit un module-level courant posé par le provider.

**Livrable** : bascule EN/ES traduit tout le chrome. (Les questions restent FR tant que B+C
ne sont pas prêtes — le sélecteur de langue n'expose que les locales complètes.)

---

## 4. Couche B — génération pluggable

`generateQuiz(rows, schema, { seed, locale?, i18n? })` — `locale` défaut `'fr'`.

### 4.1 Modules de grammaire

```ts
// src/i18n/grammar/index.ts
export interface Grammar {
  of(name: string, article?: string): string   // FR: "de la Guadeloupe" / "du Mexique" / "d'Haïti"
                                                // EN: "of Guadeloupe"   ES: "de Guadalupe" / "del …"
  list(items: string[]): string                // "X, Y et Z" / "X, Y and Z" / "X, Y y Z"
  plural(noun: string, n: number): string       // "territoires" / "territories" / "territorios"
  direction(dir: 'asc' | 'desc'): string        // "croissante" / "ascending" / "ascendente"
  cap(s: string): string
}
// src/i18n/grammar/{fr,en,es}.ts
```

- `fr.ts` = le `dePhrase()` + `humanList()` actuels de `quizGenerator.ts`, **déplacés ici**.
- `en.ts` trivial (pas de contraction d'article).
- `es.ts` : `de` / `del` selon le genre → le genre vient de l'**article traduit** (couche C).

### 4.2 Gabarits de formulation

```ts
// src/i18n/templates/{fr,en,es}.ts
export const templates: Record<TemplateKey, string>
// clés : qcm, qcmMulti, qcmInverse, boolean, cloze, numericYear, numericEstimate,
//        ordering, matching, image, imageYear, silhouette
//        + explanation.* et topic.*
```

Exemple :

| clé | fr | en |
| --- | --- | --- |
| `qcm` | `{Label} {de_subject} ?` | `{Label} of {subject}?` |
| `qcmInverse` | `Quel {noun} a pour {label} « {value} » ?` | `Which {noun} has {label} "{value}"?` |
| `ordering` | `Classez ces {nouns} par {label} {direction}.` | `Order these {nouns} by {label} ({direction}).` |
| `numericEstimate` | `Estimez : {label} {de_subject}{unit?( en {unit})}.` | `Estimate: {label} of {subject}{unit?( in {unit})}.` |

Placeholders : `{Label}`/`{label}`, `{subject}`, `{de_subject}` (= `grammar.of`), `{value}`,
`{unit}`, `{noun}`/`{nouns}`, `{direction}`, `{list}`. Helper `fill(tmpl, params)` gère
`{x}` et le conditionnel `{x?( … {x})}`.

### 4.3 Refactor de `quizGenerator.ts`

Chaque construction `` `…` `` d'énoncé / d'explication / de `topic` → `fill(templates[key], …)`.
`Label` (aujourd'hui `capitalize(spec.label)`) → `grammar.cap(labelFor(col, locale))` (le libellé
de colonne traduit, couche C).

**Détail critique — l'`id` de question reste indépendant de la locale.** `qid()` hache
`[categorie, variante, sujet]` : le `sujet` doit être la valeur **française canonique**
(`nameOf(row)` non traduit), sinon changer de langue casse le lien de l'historique
« questions à retravailler ». Idem `subject?` : on stocke la valeur FR canonique, on traduit
à l'affichage.

**Déterminisme** : `generateQuiz` déterministe par `(seed, locale)`. Test : générer en `en`,
vérifier les formulations + invariants + `toEqual` sur deux générations.

---

## 5. Couche C — données traduites

```ts
// src/data/caribbean.i18n.ts  (sidecar, même patron que shapes.ts / aliases.ts)
export const i18n: {
  values: Record<string, Partial<Record<Locale, string>>>
  //   "La Havane" → { en: 'Havana', es: 'La Habana' }
  //   "Jamaïque"  → { en: 'Jamaica', es: 'Jamaica' }
  //   "le peso cubain" → { en: 'the Cuban peso', es: 'el peso cubano' }
  articles: Record<string, Partial<Record<Locale, string>>>
  //   clé = nom de sujet FR ; "Guadeloupe" → { fr: 'la', es: 'la', en: '' }
  //   "Mexique" → { fr: 'le', es: '', en: '' }   (ES : México sans article)
  columnLabels: Record<string, Partial<Record<Locale, string>>>
  //   "capitale" → { en: 'Capital', es: 'Capital' } ; "point_culminant" → { en: 'Highest point', … }
}
```

- Générateur : `tr(value, locale) = i18n.values[value]?.[locale] ?? value`. Appliqué aux
  noms de sujets, aux valeurs de cellules texte utilisées dans énoncés/réponses, aux libellés
  de colonnes. **Jamais aux nombres.**
- Multivaleur : traduire chaque atome (`français|créole guadeloupéen`).
- On ne met dans `values` **que ce qui diffère** (les noms propres inchangés — « Pico
  Turquino » — n'y sont pas).
- Les `aliases` (réponses alternatives acceptées) deviennent aussi per-locale plus tard ;
  la traduction canonique de `values` suffit pour démarrer.

---

## 6. Fichiers concernés

| Fichier | Action |
| --- | --- |
| `src/i18n/locale.ts`, `index.ts` | **créer** — type, résolution, provider, `useT` |
| `src/i18n/messages/{fr,en,es}.ts` | **créer** — dictionnaires d'UI |
| `src/i18n/grammar/{index,fr,en,es}.ts` | **créer** — `fr` = `dePhrase`/`humanList` déplacés |
| `src/i18n/templates/{fr,en,es}.ts` | **créer** — gabarits + helper `fill` |
| `src/data/caribbean.i18n.ts` | **créer** — traductions valeurs / articles / libellés |
| `src/types/profile.ts` | `locale: Locale` sur `Profile` |
| `src/utils/profile.ts` | lire/écrire `locale`, migration défaut |
| `src/utils/number.ts` | `formatNumber` locale-aware (garder swap U+202F→U+00A0) |
| `src/utils/quizGenerator.ts` | `locale`/`i18n` en option ; énoncés → `fill(templates…)` + `grammar` + `tr()` ; `qid`/`subject` = valeur FR |
| `src/components/ProfilePage.tsx` | `<select>` de langue |
| `src/App.tsx` | `LocaleProvider`, `locale` résolue, passée à `generateQuiz` |
| Tous les composants | littéraux FR → `t('…')` |
| `src/utils/quizHistory.ts` | `by_category` : stocker l'**id** (nom de colonne) pas le libellé ; résoudre à l'affichage |
| `src/utils/quizGenerator.test.ts` | + tests génération `en` |

---

## 7. Plan d'implémentation phasé

| Phase | Contenu | Effort | Shippable ? |
| --- | --- | --- | --- |
| **0 — socle** ✅ | `Locale`, `Profile.locale`, résolution, `<html lang>`, `LocaleProvider` + `useT()`, `<select>` profil (fr seul) | ~2 h | oui (rien ne change visuellement) |
| **1 — UI EN** ✅ | `messages/fr.ts` (extraction), `messages/en.ts`, migration composants → `t()`, `formatNumber` locale-aware | ~4 h | oui — bascule EN traduit le chrome ; questions encore FR, EN pas encore dans le `<select>` |
| **2 — génération pluggable** ✅ | `grammar/{fr,en}`, `templates/{fr,en}`, refactor `generateQuiz` (`fill`, grammar, `qid` locale-indep) + tests | ~1 j | non seul (questions = « Capital of Jamaïque ? ») |
| **3 — données EN** ✅ | `data.ts` + `caribbean.i18n.ts` (valeurs + articles + libellés EN), `tr()` dans le générateur, régé. au changement de langue, historique par id | ~1 j (surtout contenu) | **oui — EN actif dans le `<select>`** |
| **4 — espagnol** ✅ | `messages/es`, `grammar/es` (de/del), `templates/es`, colonne `es` du sidecar | ~0,5 j | oui — `es` actif (relecture native à faire) |
| **5 — néerlandais** ✅ | idem, grammaire simple (van / van de) | ~0,5 j | oui — `nl` actif (relecture native à faire) |
| **6 — créole** ✅ | créole haïtien, orthographe IPN ; possession par juxtaposition, pluriel « yo » dans les gabarits | ~1 j + relecture | oui — `ht` actif (relecture native à faire) |
| **N — autre langue** | 1 fichier messages + 1 grammar (souvent trivial) + 1 templates + 1 colonne dans le sidecar de données | ~0,5 j | oui |

**Total EN complet : ~2,5 j. +0,5 j par langue « facile », ~1 j pour le créole.**

Phases 0–1 d'abord (socle propre + UI), on valide, puis 2–3 (le gros), puis 4+.

---

## 8. Décisions & garde-fous

- **`Locale = string` ouvert**, jamais une union fermée `'fr' | 'en'`. `SUPPORTED_LOCALES`
  liste ce qui est réellement câblé et alimente le `<select>`.
- **`fr` = repli et source de vérité** partout (clés de messages, CSV, `values`). Manquant →
  `fr` + `console.warn` en dev, jamais de chaîne vide ni de crash.
- **Sidecars** (`caribbean.i18n.ts`) indexés par la **valeur FR canonique**, cohérent avec
  `shapes.ts` / `aliases.ts`. Le CSV ne gagne pas de colonnes.
- **`qid` et `subject` restent en FR canonique** → l'historique « à retravailler » survit à
  un changement de langue ; on traduit à l'affichage.
- **Historique** (`by_category`, `themes` legacy) : stocker les **ids** (noms de colonnes),
  résoudre les libellés à l'affichage → l'historique ne se retrouve pas en langue mixte. Les
  lignes déjà stockées avec des libellés FR : repli / on assume.
- **Ne pas traduire les noms propres** qui n'ont pas de forme locale (« Pico Turquino »
  reste). `values` ne contient que les entrées qui diffèrent réellement.
- **Convergence packs** : à terme `locale`, `templates`, `grammar` (par famille de langue) et
  `i18n` des données vivent dans la définition du pack. Pour l'instant, bundlés à côté de
  `caribbean.csv`.
- Vérif : lint/types + tests + build + navigateur (FR **et** EN) avant chaque commit ;
  déploiement vert.
