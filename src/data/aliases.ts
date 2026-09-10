// Orthographes / traductions acceptées EN PLUS de la valeur du CSV, pour les questions à saisie
// libre (texte à trous). Clé = valeur canonique telle qu'écrite dans caribbean.csv.
// La casse, les accents, les traits d'union / apostrophes et l'article de tête sont déjà tolérés
// par la normalisation (isCorrect) — n'entrer ici que les vrais synonymes (autre langue, autre nom).
export const aliases: Record<string, string[]> = {
  "Port-d'Espagne": ['Port of Spain'],
  'La Havane': ['Havana', 'La Habana'],
  'Saint-Domingue': ['Santo Domingo'],
  'Mexico': ['Mexico City', 'Ciudad de México'],
  'Panama City': ['Ciudad de Panamá', 'Panamá'],
  'Guatemala City': ['Ciudad de Guatemala'],
}
