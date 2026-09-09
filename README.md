# Quiz Forge

Application web de quiz construite avec React, TypeScript et Vite, dérivée d'[oliver-quiz](https://github.com/lom2gwada/oliver-quiz). Elle partage le même moteur de jeu (huit types de questions, filtres, tirage aléatoire, historique) mais se concentre sur la **génération automatique de quiz** à partir d'un tableau de données.

L'idée : au lieu d'écrire chaque question à la main, on décrit un jeu de données (CSV) et un schéma, et le générateur produit un quiz complet — QCM directs et inversés, estimations numériques, classements, associations, QCM à réponses multiples.

## Fonctionnalités

- Sept types de questions jouables : QCM, texte libre, ordonnancement, vrai/faux, texte à trous, association et estimation numérique (`src/components`)
- Génération de quiz à partir d'un CSV + un schéma (`scripts/quiz-gen/`)
- Filtrage des questions par thème et par difficulté (`src/components/FilterPanel.tsx`)
- Tirage aléatoire d'un nombre de questions choisi par l'utilisateur
- Import d'un quiz au format JSON, validé avant utilisation (`src/utils/quizValidation.ts`)
- Historique des parties et profil (pseudo / avatar / thème) stockés localement (`localStorage`), sans backend
- Quiz d'exemple : [`src/data/sample-quiz.json`](src/data/sample-quiz.json), généré depuis [`scripts/quiz-gen/caribbean.csv`](scripts/quiz-gen/caribbean.csv)

## Prérequis

- [Node.js](https://nodejs.org/) 18 ou plus récent

## Installation

```bash
npm install
```

Pas de variables d'environnement, pas de service externe : le projet tourne entièrement dans le navigateur.

## Génération d'un quiz

```bash
npm run gen -- scripts/quiz-gen/caribbean.schema.json --seed maPartie --out src/data/sample-quiz.json
```

- Le **CSV** contient une ligne par entité (pays, élément, film…) et une colonne par attribut. Une cellule peut porter plusieurs valeurs séparées par `|` (→ QCM à réponses multiples).
- Le **schéma JSON** décrit chaque colonne : nature (`string` / `number`), cardinalité (`unique`), gabarits de phrase, et quels types de questions elle alimente (`ask`). C'est lui qui empêche les questions ambiguës.
- Le **seed** rend le tirage reproductible ; il est inscrit dans `metadata.seed` du quiz généré.

## Scripts disponibles

| Commande          | Description                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Démarre le serveur de développement Vite           |
| `npm run build`   | Vérifie les types puis génère le build de production |
| `npm run preview` | Prévisualise le build de production en local       |
| `npm run gen`     | Génère un quiz depuis un CSV + un schéma           |
| `npm test`        | Lance les tests unitaires (Vitest)                 |
| `npm run test:coverage` | Lance les tests avec un rapport de couverture |

## Format d'un quiz JSON

Un fichier de quiz doit respecter le contrat défini dans [`src/types/quiz.ts`](src/types/quiz.ts) et validé par [`parseQuiz`](src/utils/quizValidation.ts). Voir [`src/data/sample-quiz.json`](src/data/sample-quiz.json) pour un exemple complet.
