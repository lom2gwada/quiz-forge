import type { DataI18n } from '../i18n/data'

// Traductions du jeu de données caribéen. Source = `caribbean.csv` (français). On ne liste que
// ce qui diffère réellement (les noms propres inchangés — « Pico Turquino », « Aruba » — n'y
// sont pas). À maintenir en même temps que le CSV. Relecture EN par un locuteur natif à faire.

const values: DataI18n['values'] = {
  // — noms de territoires —
  'Antigua-et-Barbuda': { en: 'Antigua and Barbuda' },
  Barbade: { en: 'Barbados' },
  Dominique: { en: 'Dominica' },
  Grenade: { en: 'Grenada' },
  Haïti: { en: 'Haiti' },
  Jamaïque: { en: 'Jamaica' },
  'République dominicaine': { en: 'Dominican Republic' },
  'Saint-Christophe-et-Niévès': { en: 'Saint Kitts and Nevis' },
  'Sainte-Lucie': { en: 'Saint Lucia' },
  'Saint-Vincent-et-les-Grenadines': { en: 'Saint Vincent and the Grenadines' },
  'Trinité-et-Tobago': { en: 'Trinidad and Tobago' },
  'Saint-Martin': { en: 'Saint Martin' },
  'Porto Rico': { en: 'Puerto Rico' },
  'Îles Caïmans': { en: 'Cayman Islands' },
  Colombie: { en: 'Colombia' },
  Mexique: { en: 'Mexico' },

  // — capitales —
  'La Havane': { en: 'Havana' },
  'Saint-Georges': { en: "St. George's" },
  'Saint-Domingue': { en: 'Santo Domingo' },
  "Port-d'Espagne": { en: 'Port of Spain' },
  Mexico: { en: 'Mexico City' },

  // — monnaies (l'article FR de tête fait partie de la valeur) —
  'le dollar des Caraïbes orientales': { en: 'the East Caribbean dollar' },
  'le dollar bahaméen': { en: 'the Bahamian dollar' },
  'le dollar barbadien': { en: 'the Barbadian dollar' },
  'le peso cubain': { en: 'the Cuban peso' },
  'le dollar jamaïcain': { en: 'the Jamaican dollar' },
  'le peso dominicain': { en: 'the Dominican peso' },
  'la gourde': { en: 'the gourde' },
  'le dollar de Trinité-et-Tobago': { en: 'the Trinidad and Tobago dollar' },
  "l'euro": { en: 'the euro' },
  'le florin des Antilles néerlandaises': { en: 'the Netherlands Antillean guilder' },
  'le florin arubais': { en: 'the Aruban florin' },
  'le dollar américain': { en: 'the US dollar' },
  'le dollar des îles Caïmans': { en: 'the Cayman Islands dollar' },
  'le dollar bélizien': { en: 'the Belize dollar' },
  'le quetzal': { en: 'the quetzal' },
  'le lempira': { en: 'the lempira' },
  'le córdoba': { en: 'the córdoba' },
  'le colón costaricien': { en: 'the Costa Rican colón' },
  'le balboa': { en: 'the balboa' },
  'le peso colombien': { en: 'the Colombian peso' },
  'le bolívar': { en: 'the bolívar' },
  'le peso mexicain': { en: 'the Mexican peso' },

  // — langues (chaque atome d'une cellule multivaleur) —
  anglais: { en: 'English' },
  espagnol: { en: 'Spanish' },
  français: { en: 'French' },
  néerlandais: { en: 'Dutch' },
  papiamento: { en: 'Papiamento' },
  'créole antillais': { en: 'Antillean Creole' },
  'créole haïtien': { en: 'Haitian Creole' },
  'créole guadeloupéen': { en: 'Guadeloupean Creole' },
  'créole martiniquais': { en: 'Martinican Creole' },
  'créole saint-lucien': { en: 'Saint Lucian Creole' },

  // — points culminants (seuls ceux qui portent un mot français) —
  'Mont Obama': { en: 'Mount Obama' },
  'Mont Hillaby': { en: 'Mount Hillaby' },
  'Mont Sainte-Catherine': { en: 'Mount Saint Catherine' },
  'Mont Liamuiga': { en: 'Mount Liamuiga' },
  'Mont Gimie': { en: 'Mount Gimie' },
  'Montagne Pelée': { en: 'Mount Pelée' },
}

const articles: DataI18n['articles'] = {
  // En anglais, « of the … » pour ces trois-là seulement.
  Bahamas: { en: 'the' },
  'Îles Caïmans': { en: 'the' },
  'République dominicaine': { en: 'the' },
}

const columnLabels: DataI18n['columnLabels'] = {
  capitale: { en: 'capital' },
  population: { en: 'population' },
  superficie: { en: 'area' },
  densite: { en: 'density' },
  pib: { en: 'GDP' },
  'point culminant': { en: 'highest point' },
  altitude: { en: 'elevation' },
  monnaie: { en: 'currency' },
  langues: { en: 'languages' },
  'indicatif telephonique': { en: 'dialing code' },
  'domaine internet': { en: 'internet domain' },
  president: { en: 'president' },
  'premier ministre': { en: 'prime minister' },
  independance: { en: 'independence' },
  drapeau: { en: 'flag' },
}

export const caribbeanI18n: DataI18n = { values, articles, columnLabels }
