# Architecture : quiz-forge comme moteur multi-sujets (« packs »)

> **Statut** : proposition, non implémenté. Rédigé le 2026-09-10.
> Sert de référence pour quand on décidera d'ouvrir quiz-forge à d'autres sujets
> (tableau périodique, capitales du monde, œnologie, etc.).

---

## 1. Contexte : où on en est

Aujourd'hui quiz-forge est **mono-sujet**. La chaîne de génération est propre et
pure…

```
parseCsv(text) → Row[]           adaptateur CSV
inferSchema(rows) → GenSchema     inférence des rôles de colonnes
generateQuiz(rows, schema, opts) → Quiz
```

…mais tout ce qui entoure est câblé « mer des Caraïbes » :

| Endroit | Ce qui est en dur |
| --- | --- |
| `src/App.tsx` | `import caribbeanCsv`, seed `'caribbean'`, titre `Autour de la mer des Caraïbes`, `noun: 'territoire'` |
| `src/utils/quizGenerator.ts` | `CFG` (points / difficulté / tailles de groupe) ; formulations tissées dans le code |
| `src/components/ChartBackground.tsx` | `import caribbeanSvg` (côtes des Antilles) |
| `src/styles.css` | palettes `lagon` / `carte` (teal profond / parchemin) |
| `src/components/ProfilePage.tsx` | libellés « Lagon » / « Carte marine » |
| `index.html` | `<meta name="theme-color">`, favicon |
| `localStorage` | clés `quiz-forge:*` (non préfixées par sujet) |

**Le générateur, lui, ne sait rien de tout ça.** Il consomme `Row[]`. C'est le
point d'appui de toute cette architecture.

---

## 2. Objectif

quiz-forge devient un **moteur** ; un sujet devient du **contenu**.

- Ajouter un quiz sur le tableau périodique = fournir des données + de la config,
  idéalement **zéro ligne de code**.
- Le cœur (parsing, inférence, génération, player, historique, filtres) reste
  générique et profite à tous les sujets à la fois.
- Le chemin « j'uploade mon CSV et je joue » continue de marcher : c'est
  simplement un **pack ad hoc** (schéma inféré, thème par défaut).

---

## 3. Le concept de « pack de quiz »

Tout le spécifique-sujet se regroupe dans un objet **déclaratif**.

### 3.1 Interface (esquisse)

```ts
interface QuizPack {
  id: string                     // 'caribbean' | 'periodic-table'
                                 //   → clé de route + préfixe localStorage
  meta: {
    title: string                // "Autour de la mer des Caraïbes"
    author: string
    noun: string                 // "territoire", "élément" — utilisé dans les énoncés
    description?: string
    favicon: string              // emoji
  }

  source: DataSource             // voir §5

  schema?: SchemaOverrides        // par colonne : rôle, kind forcé, unité,
                                  //   sens de tri, types de questions autorisés, poids
  generation?: Partial<GenConfig> // points/difficulté/tailles par type + gabarits (§9)

  theme: ThemeConfig             // voir §8

  hooks?: {
    preprocessRows?(rows: Row[]): Row[]      // colonnes dérivées, nettoyage
    extraQuestions?(ctx: GenContext): Question[]   // générateur maison (rare)
  }
}
```

### 3.2 Où vit la variation

| Axe | Exemple « tableau périodique » | Data ou code ? |
| --- | --- | --- |
| Données | le CSV des 118 éléments | **data** |
| Rôles de colonnes | `numero_atomique` = index (tri asc, pas d'estimation) ; `symbole` ↔ `nom` inversables | **data** (`schema`) |
| Règles de génération | `config_electronique` → cloze seulement ; `masse_atomique` → estimation + classement ; `groupe` → catégoriel | **data** (`allowedTypes`, `orderingDirection`, `weight` par colonne) |
| Formulations | « Quel élément a pour symbole X ? » vs « Capitale de X ? » | **data** (gabarits, §9) |
| Identité visuelle | palette, police, fond | **data** (`theme`) |
| Type de question inédit | « structure de Lewis » | **code** (hook `extraQuestions`) — rare |

Constat : **~90 % est exprimable en config**. Le hook n'est qu'une soupape.

---

## 4. La frontière sacrée : `Row[]`

`generateQuiz` ne reçoit **jamais** un fichier, une URL ou une connexion — il
reçoit `Row[]` (`Record<string, string>[]`). Tout ce qui précède est un
adaptateur.

Conséquences :

- On **coerce tout en chaîne à la frontière** : `null → ''`, `number → String(n)`,
  `array → join('|')`. Le design « string d'abord » du générateur devient un
  atout (une base typée n'oblige à rien réécrire).
- Changer de source de données ne touche **que** l'adaptateur.
- Les tests du générateur restent des tests de fonction pure sur des `Row[]`.

---

## 5. Source de données

```ts
type DataSource =
  | { kind: 'csv';  load: () => Promise<string> }      // import ?raw (bundlé)
  | { kind: 'rows'; load: () => Promise<RawRow[]> }    // API REST, Supabase, Sheet-JSON, Airtable…
// le core normalise → Row[] quelle que soit la source
```

### CSV bundlé vs base de données

| | CSV bundlé | Base de données |
| --- | --- | --- |
| Chargement | synchrone au démarrage | **async** : spinner, erreur, retry, cache |
| Offline | marche | cache-first nécessaire |
| Schéma | inféré de chaînes | souvent **typé** (mieux) — l'inférence devient un repli |
| Volume | 30–120 lignes | potentiellement des milliers → plafonner (`LIMIT`, échantillon, quotas) |
| Fraîcheur | figé au build | live |

Seul vrai chantier côté app : passer le démarrage de « eager + synchrone » à
« async + états de chargement » (étape 3 de la migration, §11).

### Quelle « base » ?

| Backend | Ops | quiz-forge reste… |
| --- | --- | --- |
| Google Sheet publié / Airtable / Supabase (clé anon + RLS lecture seule) | ~nulle (un `fetch` avec clé publique) | un site statique |
| Fichier JSON régénéré par un cron / CI | nulle au runtime | un site statique |
| Postgres auto-hébergé + auth | tu as un backend : hébergement, secrets, coût | une app avec serveur |

### Option souvent la meilleure pour du perso : **fetch au build**

Un script tire la base et écrit un CSV/JSON dans le bundle **au moment du build**.
Le runtime reste statique, synchrone, offline. « Mettre à jour les données » =
relancer le build (workflow GitHub manuel ou cron). On édite dans
Sheet/Airtable/Notion, le build fige un instantané. Zéro complexité runtime.

---

## 6. Modèles de déploiement

| Option | Principe | Verdict |
| --- | --- | --- |
| **A — mono-app + registre** | un build, packs bundlés, choix par route `#/periodic-table` ou page d'accueil | ✅ **recommandé** |
| B — repo template + repo par sujet | le moteur est une dépendance ; chaque sujet a son repo / déploiement | seulement si un quiz doit diverger fort ou être livré séparément |
| C — packs chargés à distance | core figé, packs = fichiers JSON+CSV servis ailleurs | si on veut ajouter un quiz sans rebuild — suppose 0 code par pack (voir §10) |

Pour quelques quiz perso : **A**. Une seule base à améliorer, un seul
déploiement. Ajouter un sujet = un dossier `src/packs/<id>/` + une ligne de
registre. Les CSV pèsent des Ko, les SVG ~25 Ko et se chargent en `import()`
paresseux.

```ts
// src/packs/index.ts
export const PACKS = { caribbean, periodicTable } as const
// sélection : ?pack=periodic-table  →  sinon défaut  →  sinon page de choix
```

---

## 7. Ce qu'il faut « dé-hardcoder »

- `App.tsx` : seed, titre, `noun`, `import` du CSV → viennent du **pack actif**
- `generateQuiz(rows, schema, { seed })` → `+ { config }` : le `CFG` en dur devient
  paramètre, avec des cases par colonne
- `inferSchema` → `resolveSchema(rows, overrides)` : inférence **+** overrides du
  pack, fusionnés
- `ChartBackground` : SVG en dur → reçu par prop / contexte (rend `null` si pas de
  fond)
- `styles.css` : palettes en dur → variables CSS posées au runtime depuis
  `pack.theme.palettes` ; on **garde les deux *slots*** (sombre / clair)
- `ProfilePage` : libellés « Lagon » / « Carte marine » → `pack.theme.slotLabels`
- `index.html` `theme-color`, favicon → du pack
- **`localStorage`** : `quiz-forge:*` → `quiz-forge:<packId>:*`
  (sinon les historiques de sujets se mélangent). Le *slot* de thème choisi peut
  rester global.

---

## 8. Thème : généralisation

```ts
interface ThemeConfig {
  fontUrl?: string          // Google Fonts
  fontStack: string
  palettes: {               // les deux slots, chacun entièrement défini par le pack
    lagon: Palette          //   (slot « sombre » historique)
    carte: Palette          //   (slot « clair » historique)
  }
  slotLabels?: { lagon: string; carte: string }   // "Lagon"/"Carte marine" ou "Sombre"/"Clair"
  background?: () => Promise<string>               // SVG inline, ou rien
}
type Palette = Record<string, string>  // --bg, --text, --accent, --map-ink, …
```

- Appliqué au runtime : `document.documentElement.style.setProperty('--accent', …)`
  pour chaque token du slot actif.
- On ne touche **pas** au modèle « 2 slots » : `data-theme` reste `lagon` /
  `carte`, seul le contenu des palettes devient variable.
- `ChartBackground` devient générique : `null` si `pack.theme.background` est
  absent. Un pack « chimie » peut n'avoir aucun fond, ou une trame de tableau
  périodique.
- ⚠️ garder la règle actuelle : dégradé de fond sur `:root` (se propage au canvas),
  `body { background: transparent }` — cf. le bug de z-index déjà corrigé.

---

## 9. Gabarits de formulation

Aujourd'hui les énoncés sont tissés dans `generateQuiz` (« Capitale de X ? ») —
c'est le point faible connu (formulations sèches, pas idiomatiques par sujet).

En config :

```ts
generation.templates = {
  qcm:         "{Label} {de_subject} ?",
  qcmInverse:  "Quel {noun} a pour {label} « {value} » ?",
  cloze:       "{Label} {de_subject} : ___",
  boolean:     "{Label} {de_subject} : {value}.",
  numeric:     "Estimez : {label} {de_subject}{unit?( en {unit})}.",
  ordering:    "Classez ces {noun}s par {label} {direction}.",
  matching:    "Associez chaque {noun} à : {label}.",
}
// surcharge possible par colonne :
//   columns.symbole.template = "Quel élément a pour symbole {value} ?"
```

Placeholders : `{subject}`, `{de_subject}` (avec article FR), `{label}`, `{Label}`,
`{value}`, `{unit}`, `{noun}`, `{direction}`. Ça résout d'un coup **la qualité des
formulations** et **l'idiomatisme par pack**.

> Note : `topic` (libellé neutre pour les listes de révision) suit les mêmes
> gabarits, en version « groupe nominal » — voir `src/utils/quizGenerator.ts`.

---

## 10. L'état final : config = donnée

Le plus propre : le stockage ne contient pas *que* les lignes, il contient
**lignes + schéma + config de génération + thème**. Tout le déclaratif est de la
donnée.

### 10.1 Forme du stockage

```
packs/periodic-table            { meta, theme, generation }
packs/periodic-table/columns    [{ name:'symbole', role:'attribute', kind:'string',
                                   unique:true, allowedTypes:['qcm','qcm-inverse','cloze'],
                                   template:'Quel élément a pour symbole {value} ?' }, …]
packs/periodic-table/rows       [{ data:{ … } }, …]
```

Le core devient un **pur moteur de rendu** :
`fetch(config + colonnes + lignes) → generateQuiz → jouer`. Aucun code par sujet.
Nouveau sujet = saisie de données.

### 10.2 `inferSchema` démote en assistant d'authoring

L'inférence ne disparaît pas, elle **change de rôle** : au premier chargement d'un
CSV / d'une table, elle propose (« voilà ce que je devine »), l'utilisateur
confirme / corrige, puis **on sauve le schéma comme donnée**. Plus de devinette au
runtime.

### 10.3 Les trois pièges

1. **Le code résiduel ne se stocke pas.** Hooks et types de question inédits :
   la config **référence** un hook par nom (`"hook": "periodicTableExtras"`)
   résolu dans un petit **registre de code**. 95 % des packs n'en ont pas.
2. **Il faut un validateur de config** — l'équivalent de `parseQuiz` mais pour le
   pack — exécuté à la sauvegarde **et** au chargement. Config-donnée invalide =
   quiz cassé au runtime sinon.
3. **Le vrai travail se déplace vers l'UI d'authoring** : `GeneratorPanel` évolue
   en éditeur de schéma persistant + édition des lignes (l'ambition de la page
   ⚙️) + éditeur de thème. C'est *ça* qui rend « monter un quiz sur n'importe
   quoi » réellement facile pour un non-codeur.

Ne pas oublier : **versionnage / migrations** de la config stockée (même problème
que les clés `themes`/`by_theme` legacy déjà gérées).

---

## 11. Chemin de migration incrémental

> Pas une réécriture. Chaque étape laisse l'app fonctionnelle.

1. **Introduire `QuizPack` + `definePack()`.** Emballer l'existant dans
   `src/packs/caribbean/`. `activePack` codé en dur = caribbean.
   **Zéro changement de comportement.** ← le refactor qui compte : tout le
   spécifique-Caraïbes déménage dans le pack.
2. **Paramétrer.** `generateQuiz(…, { config })`, `ChartBackground` reçoit son SVG
   en prop, palettes pilotées par le pack.
3. **Registre + sélection.** `src/packs/index.ts`, route / `?pack=`, mini page de
   choix. Deux packs coexistent. Passer le démarrage en **async** (états de
   chargement).
4. **Namespacer le `localStorage`** par `packId`.
5. **Construire le pack `periodic-table` pour de vrai.** C'est lui qui révèle ce
   qui reste en dur et si `SchemaOverrides` est assez expressif.
6. **Config = donnée.** Sortir les overrides des fichiers `.ts` vers du JSON
   (`packs/<id>.json`), versionné. `inferSchema` ne sert plus qu'au bootstrap.
7. *(plus tard, si friction)* Migrer le stockage vers une base + construire
   l'éditeur d'authoring. Formaliser le hook `extraQuestions`.

Étapes 1–5 = le socle. Étapes 6–7 se justifient quand éditer du JSON à la main
devient pénible, pas avant.

---

## 12. Garde-fous

- **Ne pas construire le système de plugins avant d'avoir deux packs réels.**
  Faire les étapes 1–5, laisser le pack périodique « faire mal » là où le
  déclaratif coince, **puis** extraire le hook. Sinon on abstrait dans le vide.
- **Garder la frontière `Row[]` sacrée.** Toute nouvelle source = un adaptateur,
  jamais une fuite dans le générateur.
- **Garder le modèle « 2 slots » de thème.** On rend les palettes variables, pas
  le nombre de thèmes.
- **Pour une vraie base : endpoints lecture seule publics** (Sheet / Airtable /
  Supabase anon) → quiz-forge reste un site statique. Un backend auto-hébergé,
  c'est un autre projet.
- **Data rarement modifiée → fetch au build**, on s'épargne même les états de
  chargement.

---

## Annexe : fichiers concernés (indicatif)

| Fichier | Nature du changement |
| --- | --- |
| `src/packs/**` | **nouveau** — un dossier par sujet + `index.ts` (registre) |
| `src/types/pack.ts` | **nouveau** — `QuizPack`, `SchemaOverrides`, `GenConfig`, `ThemeConfig` |
| `src/utils/quizGenerator.ts` | `CFG` → paramètre `config` ; gabarits ; `inferSchema` → `resolveSchema` |
| `src/utils/packValidation.ts` | **nouveau** — valide un pack / une config (jumeau de `parseQuiz`) |
| `src/App.tsx` | lit le pack actif ; démarrage async ; sélection de pack |
| `src/components/ChartBackground.tsx` | SVG en prop/contexte, `null` si absent |
| `src/components/GeneratorPanel.tsx` | évolue en éditeur de schéma (étape 7) |
| `src/utils/theme.ts` + `styles.css` | palettes posées au runtime depuis le pack |
| `src/utils/profile.ts`, `quizHistory.ts` | clés `localStorage` préfixées par `packId` |
| `index.html` | `theme-color` / favicon dynamiques (ou génériques) |
