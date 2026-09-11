/** Dictionnaire d'UI — SOURCE DE VÉRITÉ. `MessageKey` en dérive : toute autre locale doit
 * fournir exactement ces clés (sinon erreur TS). Placeholders : {nom}. */
export const fr = {
  // — commun —
  'common.back': 'Retour',
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.saving': 'Enregistrement…',
  'common.loading': 'Chargement…',
  'common.or': ' ou ',

  // — en-tête / navigation —
  'header.by': 'par {author}',
  'header.soundOn': 'Activer le son',
  'header.soundOff': 'Couper le son',
  'nav.profile': 'Profil',
  'nav.fiches': 'Fiches',
  'nav.quiz': 'Quiz',
  'nav.history': 'Historique',

  // — accueil —
  'start.questionCount': 'Nombre de questions',
  'start.count.one': '{n} question',
  'start.count.other': '{n} questions',
  'start.unavailableSuffix': ' (indisponible)',
  'start.allQuestions': 'Toutes les questions ({n})',
  'start.availability': '{n} questions disponibles · {picked} tirées au hasard.',
  'start.play': 'Démarrer le quiz',

  // — filtres —
  'filter.aria': 'Filtres du quiz',
  'filter.categories': 'Catégories',
  'filter.selected.one': '{n} catégorie sélectionnée',
  'filter.selected.other': '{n} catégories sélectionnées',
  'filter.allCategories': 'Toutes les catégories',
  'filter.difficulty': 'Difficulté',
  'filter.allDifficulties': 'Toutes les difficultés',
  'difficulty.easy': 'Facile',
  'difficulty.medium': 'Intermédiaire',
  'difficulty.hard': 'Difficile',

  // — types de questions —
  'type.qcm': 'QCM',
  'type.code': 'Code',
  'type.text': 'Texte',
  'type.ordering': 'Ordre',
  'type.boolean': 'Vrai/Faux',
  'type.cloze': 'Texte à trous',
  'type.matching': 'Association',
  'type.numeric': 'Estimation',

  // — page quiz —
  'quiz.noQuestion': 'Aucune question',
  'quiz.noQuestionHint': 'Modifiez les filtres pour lancer le quiz.',
  'quiz.progress': 'Question {current} / {total}',
  'quiz.previous': 'Précédente',
  'quiz.next': 'Suivante',
  'quiz.finish': 'Voir ma correction',
  'quiz.abandonConfirm': 'Abandonner le quiz en cours ? Votre progression sera perdue.',
  'quiz.points': '{n} pts',

  // — composants de réponse —
  'bool.true': 'Vrai',
  'bool.false': 'Faux',
  'cloze.answerAria': 'Réponse',
  'text.placeholder': 'Votre réponse…',
  'ordering.up': 'Monter',
  'ordering.down': 'Descendre',

  // — résultats —
  'result.yourScore': 'Votre score',
  'result.points': '{earned} / {total} points',
  'result.time': '⏱ Temps : {duration}',
  'result.restart': 'Recommencer',
  'result.byCategory': 'Par catégorie',
  'result.byDifficulty': 'Par difficulté',
  'result.categoryScore': '{label} — score',
  'result.passed': 'Réussi',
  'result.failed': 'Raté',
  'result.correct': '✓ Bonne réponse',
  'result.incorrect': '✗ Réponse incorrecte',
  'result.yourAnswer': 'Votre réponse :',
  'result.goodAnswer': 'Bonne réponse :',
  'result.noAnswer': 'Aucune réponse',
  'result.viewFiche': 'Voir la fiche {name} →',
  'result.mention.excellent': 'Excellent',
  'result.mention.veryGood': 'Très bien',
  'result.mention.good': 'Bien',
  'result.mention.tryHarder': 'Peut mieux faire',
  'result.mention.review': 'À revoir',

  // — historique —
  'history.title': 'Historique des parties',
  'history.loadError': "Impossible de charger l'historique.",
  'history.empty': "Aucune partie enregistrée pour l'instant.",
  'history.quizLabel': 'Quiz',
  'history.gamesPlayed': 'Parties jouées',
  'history.bestScore': 'Meilleur score',
  'history.avgScore': 'Score moyen',
  'history.totalTime': 'Temps de jeu cumulé',
  'history.byType': 'Par type de question',
  'history.toReview': 'Questions à retravailler',
  'history.replayMistakes': 'Reprendre mes erreurs',
  'history.missedRatio': 'Ratée {wrong} fois sur {attempts}',
  'history.pointsPair': '{earned} / {total} pts',

  // — profil —
  'profile.title': 'Profil',
  'profile.pseudo': 'Pseudo',
  'profile.pseudoPlaceholder': 'Ton prénom ou pseudo',
  'profile.avatar': 'Avatar',
  'profile.avatarCustom': 'Ou le tien : un emoji, ou un code Unicode (« U+1F984 »).',
  'profile.theme': 'Thème',
  'profile.themeLagon': '🌙 Lagon',
  'profile.themeCarte': '🧭 Carte marine',
  'profile.language': 'Langue',
  'profile.saveError': "Impossible d'enregistrer le profil. Réessayez.",
  'profile.saved': 'Profil enregistré ✓',

  // — page « ⚙️ Quiz » (contenu / génération) —
  'content.title': 'Quiz',
  'content.regenerate': '🎲 Régénérer les questions',
  'content.importCsv': 'Importer un CSV',
  'content.distribution': 'Répartition des questions',
  'content.categoriesChart': 'Catégories — {n} questions',
  'content.typesChart': 'Types — {n} questions',
  'content.difficultyChart': 'Difficulté — {n} questions',

  // — panneau générateur —
  'gen.title': 'Générer un quiz depuis ces données ({n} lignes)',
  'gen.subjectColumn': 'Colonne « sujet »',
  'gen.itemNoun': "Nom d'un élément",
  'gen.itemNounPlaceholder': 'pays, ville, film…',
  'gen.quizTitle': 'Titre du quiz',
  'gen.multivalueSep': 'séparateur multivaleur',
  'gen.seed': 'Seed',
  'gen.randomSeed': 'Seed aléatoire',
  'gen.generate': 'Générer le quiz',
  'gen.needColumn': 'Active au moins une colonne.',
  'gen.badge.image': 'image',
  'gen.badge.unique': 'unique',
  'gen.badge.number': 'nombre',
  'gen.badge.text': 'texte',
  'gen.badge.year': 'année',
  'gen.badge.multi': 'multi',

  // — fiches / atlas —
  'atlas.title': 'Fiches',
  'atlas.filterPlaceholder': 'Filtrer par nom…',
  'atlas.filterAria': 'Filtrer les fiches par nom',
  'atlas.sortBy': 'Trier par',
  'atlas.sortName': 'nom',
  'atlas.sortAsc': 'Ordre croissant, cliquer pour décroissant',
  'atlas.sortDesc': 'Ordre décroissant, cliquer pour croissant',
  'atlas.empty': 'Aucune fiche pour « {query} ».',
  'fiche.silhouetteLabel': 'Silhouette : {name} (survoler pour agrandir)',
  'fiche.flagLabel': 'Image de {name} — survoler pour agrandir, cliquer pour ouvrir',
  'fiche.regionLabel': 'Position dans les Caraïbes : {name} (survoler pour agrandir)',
  'fiche.modalLabel': 'Fiche : {name}',
  'fiche.close': 'Fermer',

  // — tableau de données —
  'data.title': 'Données source — {rows} lignes × {cols} colonnes',

  // — divers —
  'cellImg.open': "Ouvrir l'image « {name} » dans un nouvel onglet",
  'shape.defaultAlt': "Silhouette d'un territoire.",
  'scoreChart.aria': 'Évolution du score dans le temps',
} satisfies Record<string, string>

export type MessageKey = keyof typeof fr
