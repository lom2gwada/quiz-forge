import type { DataI18n } from '../i18n/data'

// Traductions du jeu de données caribéen. Source = `caribbean.csv` (français). On ne liste que
// ce qui diffère réellement du français. Locales : en (relu), es / nl / ht (à faire relire par
// un locuteur natif). À maintenir en même temps que le CSV.

const values: DataI18n['values'] = {
  // — noms de territoires —
  'Antigua-et-Barbuda': { en: 'Antigua and Barbuda', es: 'Antigua y Barbuda', nl: 'Antigua en Barbuda', ht: 'Antigwa ak Barbouda' },
  Bahamas: { ht: 'Bahamas' },
  Barbade: { en: 'Barbados', es: 'Barbados', nl: 'Barbados', ht: 'Barbad' },
  Cuba: { ht: 'Kiba' },
  Dominique: { en: 'Dominica', es: 'Dominica', nl: 'Dominica', ht: 'Dominik' },
  Grenade: { en: 'Grenada', es: 'Granada', nl: 'Grenada', ht: 'Grenad' },
  Haïti: { en: 'Haiti', es: 'Haití', ht: 'Ayiti' },
  Jamaïque: { en: 'Jamaica', es: 'Jamaica', nl: 'Jamaica', ht: 'Jamayik' },
  'République dominicaine': { en: 'Dominican Republic', es: 'República Dominicana', nl: 'Dominicaanse Republiek', ht: 'Repiblik Dominikèn' },
  'Saint-Christophe-et-Niévès': { en: 'Saint Kitts and Nevis', es: 'San Cristóbal y Nieves', nl: 'Saint Kitts en Nevis', ht: 'Sen Kristòf ak Nevis' },
  'Sainte-Lucie': { en: 'Saint Lucia', es: 'Santa Lucía', nl: 'Saint Lucia', ht: 'Sent Lisi' },
  'Saint-Vincent-et-les-Grenadines': { en: 'Saint Vincent and the Grenadines', es: 'San Vicente y las Granadinas', nl: 'Saint Vincent en de Grenadines', ht: 'Sen Vensan ak Grenadin yo' },
  'Trinité-et-Tobago': { en: 'Trinidad and Tobago', es: 'Trinidad y Tobago', nl: 'Trinidad en Tobago', ht: 'Trinidad ak Tobago' },
  Guadeloupe: { es: 'Guadalupe', ht: 'Gwadloup' },
  Martinique: { es: 'Martinica', ht: 'Matinik' },
  'Saint-Martin': { en: 'Saint Martin', es: 'San Martín', ht: 'Sen Maten' },
  'Saint-Barthélemy': { es: 'San Bartolomé', ht: 'Sen Batèlmi' },
  'Sint Maarten': {},
  Aruba: { ht: 'Awouba' },
  Curaçao: { es: 'Curazao', ht: 'Kirasao' },
  'Porto Rico': { en: 'Puerto Rico', es: 'Puerto Rico', nl: 'Puerto Rico', ht: 'Pòtoriko' },
  'Îles Caïmans': { en: 'Cayman Islands', es: 'Islas Caimán', nl: 'Kaaimaneilanden', ht: 'Zile Kayiman' },
  Belize: { es: 'Belice', ht: 'Beliz' },
  Guatemala: { ht: 'Gwatemala' },
  Honduras: { ht: 'Ondiras' },
  Nicaragua: { ht: 'Nikaragwa' },
  'Costa Rica': { ht: 'Kostarika' },
  Panama: { es: 'Panamá' },
  Colombie: { en: 'Colombia', es: 'Colombia', nl: 'Colombia', ht: 'Kolonbi' },
  Venezuela: { ht: 'Venezyela' },
  Mexique: { en: 'Mexico', es: 'México', nl: 'Mexico', ht: 'Meksik' },

  // — capitales —
  'La Havane': { en: 'Havana', es: 'La Habana', nl: 'Havana', ht: 'Lavàn' },
  'Saint-Georges': { en: "St. George's", es: "Saint George's", nl: "Saint George's", ht: 'Sen Jòj' },
  'Saint-Domingue': { en: 'Santo Domingo', es: 'Santo Domingo', nl: 'Santo Domingo', ht: 'Sendomeng' },
  "Port-d'Espagne": { en: 'Port of Spain', es: 'Puerto España', nl: 'Port of Spain', ht: 'Pòtdespay' },
  'Port-au-Prince': { ht: 'Pòtoprens' },
  'Basse-Terre': { ht: 'Bastè' },
  'Fort-de-France': { ht: 'Fòdefrans' },
  Mexico: { en: 'Mexico City', es: 'Ciudad de México', nl: 'Mexico-Stad', ht: 'Meksiko' },

  // — monnaies (l'article FR de tête fait partie de la valeur) —
  'le dollar des Caraïbes orientales': { en: 'the East Caribbean dollar', es: 'el dólar del Caribe Oriental', nl: 'de Oost-Caribische dollar', ht: 'dola Karayib de Lès la' },
  'le dollar bahaméen': { en: 'the Bahamian dollar', es: 'el dólar bahameño', nl: 'de Bahamaanse dollar', ht: 'dola Bahamas la' },
  'le dollar barbadien': { en: 'the Barbadian dollar', es: 'el dólar de Barbados', nl: 'de Barbadiaanse dollar', ht: 'dola Barbad la' },
  'le peso cubain': { en: 'the Cuban peso', es: 'el peso cubano', nl: 'de Cubaanse peso', ht: 'peso kiben an' },
  'le dollar jamaïcain': { en: 'the Jamaican dollar', es: 'el dólar jamaicano', nl: 'de Jamaicaanse dollar', ht: 'dola jamayiken an' },
  'le peso dominicain': { en: 'the Dominican peso', es: 'el peso dominicano', nl: 'de Dominicaanse peso', ht: 'peso dominiken an' },
  'la gourde': { en: 'the gourde', es: 'el gourde', nl: 'de gourde', ht: 'goud la' },
  'le dollar de Trinité-et-Tobago': { en: 'the Trinidad and Tobago dollar', es: 'el dólar de Trinidad y Tobago', nl: 'de Trinidad en Tobago-dollar', ht: 'dola Trinidad ak Tobago a' },
  "l'euro": { en: 'the euro', es: 'el euro', nl: 'de euro', ht: 'ero a' },
  'le florin des Antilles néerlandaises': { en: 'the Netherlands Antillean guilder', es: 'el florín de las Antillas Neerlandesas', nl: 'de Nederlands-Antilliaanse gulden', ht: 'florin Antiy Neyèlandè yo' },
  'le florin arubais': { en: 'the Aruban florin', es: 'el florín arubeño', nl: 'de Arubaanse florin', ht: 'florin arouba a' },
  'le dollar américain': { en: 'the US dollar', es: 'el dólar estadounidense', nl: 'de Amerikaanse dollar', ht: 'dola ameriken an' },
  'le dollar des îles Caïmans': { en: 'the Cayman Islands dollar', es: 'el dólar de las Islas Caimán', nl: 'de Kaaimaneilandse dollar', ht: 'dola Zile Kayiman yo' },
  'le dollar bélizien': { en: 'the Belize dollar', es: 'el dólar de Belice', nl: 'de Belizaanse dollar', ht: 'dola beliz la' },
  'le quetzal': { en: 'the quetzal', es: 'el quetzal', nl: 'de quetzal', ht: 'ketsal la' },
  'le lempira': { en: 'the lempira', es: 'el lempira', nl: 'de lempira', ht: 'lempira a' },
  'le córdoba': { en: 'the córdoba', es: 'el córdoba', nl: 'de córdoba', ht: 'kòdoba a' },
  'le colón costaricien': { en: 'the Costa Rican colón', es: 'el colón costarricense', nl: 'de Costa Ricaanse colón', ht: 'kolon kostariken an' },
  'le balboa': { en: 'the balboa', es: 'el balboa', nl: 'de balboa', ht: 'balboa a' },
  'le peso colombien': { en: 'the Colombian peso', es: 'el peso colombiano', nl: 'de Colombiaanse peso', ht: 'peso kolonbyen an' },
  'le bolívar': { en: 'the bolívar', es: 'el bolívar', nl: 'de bolívar', ht: 'bolivar a' },
  'le peso mexicain': { en: 'the Mexican peso', es: 'el peso mexicano', nl: 'de Mexicaanse peso', ht: 'peso meksiken an' },

  // — langues (chaque atome d'une cellule multivaleur) —
  anglais: { en: 'English', es: 'inglés', nl: 'Engels', ht: 'angle' },
  espagnol: { en: 'Spanish', es: 'español', nl: 'Spaans', ht: 'panyòl' },
  français: { en: 'French', es: 'francés', nl: 'Frans', ht: 'franse' },
  néerlandais: { en: 'Dutch', es: 'neerlandés', nl: 'Nederlands', ht: 'olandè' },
  papiamento: { en: 'Papiamento', nl: 'Papiaments', ht: 'papyamento' },
  'créole antillais': { en: 'Antillean Creole', es: 'criollo antillano', nl: 'Antilliaans Creools', ht: 'kreyòl antiye' },
  'créole haïtien': { en: 'Haitian Creole', es: 'criollo haitiano', nl: 'Haïtiaans Creools', ht: 'kreyòl ayisyen' },
  'créole guadeloupéen': { en: 'Guadeloupean Creole', es: 'criollo guadalupeño', nl: 'Guadeloups Creools', ht: 'kreyòl gwadloup' },
  'créole martiniquais': { en: 'Martinican Creole', es: 'criollo martiniqués', nl: 'Martinikaans Creools', ht: 'kreyòl matinik' },
  'créole saint-lucien': { en: 'Saint Lucian Creole', es: 'criollo santalucense', nl: 'Saint Luciaans Creools', ht: 'kreyòl sent lisi' },

  // — points culminants (seuls ceux qui portent un mot français) —
  'Mont Obama': { en: 'Mount Obama', es: 'Monte Obama', nl: 'Mount Obama', ht: 'Mòn Obama' },
  'Mont Hillaby': { en: 'Mount Hillaby', es: 'Monte Hillaby', nl: 'Mount Hillaby', ht: 'Mòn Hillaby' },
  'Mont Sainte-Catherine': { en: 'Mount Saint Catherine', es: 'Monte Santa Catalina', nl: 'Mount Saint Catherine', ht: 'Mòn Sent Katrin' },
  'Mont Liamuiga': { en: 'Mount Liamuiga', es: 'Monte Liamuiga', nl: 'Mount Liamuiga', ht: 'Mòn Liamuiga' },
  'Mont Gimie': { en: 'Mount Gimie', es: 'Monte Gimie', nl: 'Mount Gimie', ht: 'Mòn Gimie' },
  'Montagne Pelée': { en: 'Mount Pelée', es: 'Montaña Pelada', ht: 'Mòn Pele' },
  'Pic la Selle': { ht: 'Pik la Sèl' },
  'Morne Diablotins': { ht: 'Mòn Dyabloten' },
  'Morne du Vitet': { ht: 'Mòn Vitèt' },
  'Pic Paradis': { ht: 'Pik Paradi' },

  // — régimes politiques —
  'monarchie constitutionnelle': { en: 'constitutional monarchy', es: 'monarquía constitucional', nl: 'constitutionele monarchie', ht: 'monachi konstitisyonèl' },
  'monarchie constitutionnelle fédérale': { en: 'federal constitutional monarchy', es: 'monarquía constitucional federal', nl: 'federale constitutionele monarchie', ht: 'monachi konstitisyonèl federal' },
  'république parlementaire': { en: 'parliamentary republic', es: 'república parlamentaria', nl: 'parlementaire republiek', ht: 'repiblik palmantè' },
  'république socialiste à parti unique': { en: 'one-party socialist republic', es: 'república socialista de partido único', nl: 'socialistische eenpartijrepubliek', ht: 'repiblik sosyalis yon sèl pati' },
  'république semi-présidentielle': { en: 'semi-presidential republic', es: 'república semipresidencial', nl: 'semipresidentiële republiek', ht: 'repiblik semi-prezidansyèl' },
  'république présidentielle': { en: 'presidential republic', es: 'república presidencial', nl: 'presidentiële republiek', ht: 'repiblik prezidansyèl' },
  'république fédérale présidentielle': { en: 'federal presidential republic', es: 'república federal presidencial', nl: 'federale presidentiële republiek', ht: 'repiblik federal prezidansyèl' },
  "département et région d'outre-mer français": { en: 'French overseas department and region', es: 'departamento y región de ultramar francés', nl: 'Frans overzees departement en regio', ht: 'depatman ak rejyon lòtbò lanmè fransè' },
  'collectivité territoriale unique française': { en: 'French single territorial authority', es: 'colectividad territorial única francesa', nl: 'Franse territoriale eenheidsgemeenschap', ht: 'kolektivite teritoryal inik fransè' },
  "collectivité d'outre-mer française": { en: 'French overseas collectivity', es: 'colectividad de ultramar francesa', nl: 'Franse overzeese gemeenschap', ht: 'kolektivite lòtbò lanmè fransè' },
  'pays constitutif du royaume des Pays-Bas': { en: 'constituent country of the Kingdom of the Netherlands', es: 'país constitutivo del Reino de los Países Bajos', nl: 'land binnen het Koninkrijk der Nederlanden', ht: 'peyi ki fè pati Wayòm Peyi Ba yo' },
  "territoire non incorporé des États-Unis": { en: 'unincorporated territory of the United States', es: 'territorio no incorporado de los Estados Unidos', nl: 'niet-geïncorporeerd gebied van de Verenigde Staten', ht: 'teritwa Etazini ki pa enkòpore' },
  "territoire britannique d'outre-mer": { en: 'British Overseas Territory', es: 'territorio británico de ultramar', nl: 'Brits overzees gebied', ht: 'teritwa britanik lòtbò lanmè' },

  // — organisations internationales (chaque atome d'une cellule multivaleur) —
  ONU: { en: 'UN', nl: 'VN' },
  OEA: { en: 'OAS', nl: 'OAS' },
  UE: { en: 'EU', nl: 'EU' },

  // — religions (chaque atome, hors pourcentage entre parenthèses — jamais traduit, cf. `splitAnnotation`) —
  protestantisme: { en: 'Protestantism', es: 'protestantismo', nl: 'protestantisme', ht: 'Pwotestantis' },
  catholicisme: { en: 'Catholicism', es: 'catolicismo', nl: 'katholicisme', ht: 'Katolisis' },
  'protestantisme évangélique': { en: 'evangelical Protestantism', es: 'protestantismo evangélico', nl: 'evangelisch protestantisme', ht: 'Pwotestantis Evanjelik' },
  'sans religion ou autre': { en: 'no religion or other', es: 'sin religión u otra', nl: 'geen religie of anders', ht: 'san relijyon oswa lòt' },
  rastafari: { en: 'Rastafari', ht: 'Rastafari' },
  vaudou: { en: 'Vodou', es: 'vudú', nl: 'voodoo', ht: 'Vodou' },
  hindouisme: { en: 'Hinduism', es: 'hinduismo', nl: 'hindoeïsme', ht: 'Endouyis' },
  islam: { en: 'Islam', ht: 'Islam' },
  santería: { en: 'Santería', ht: 'Senteria' },
}

const articles: DataI18n['articles'] = {
  Bahamas: { en: 'the', es: 'las', nl: 'de' },
  'Îles Caïmans': { en: 'the', es: 'las', nl: 'de' },
  'République dominicaine': { en: 'the', es: 'la', nl: 'de' },
}

// Les libellés FR auto-dérivés des en-têtes CSV (ASCII, tout en minuscules) sont parfois faux :
// on les corrige ici pour `fr` aussi (accents, acronymes).
const columnLabels: DataI18n['columnLabels'] = {
  capitale: { en: 'capital', es: 'capital', nl: 'hoofdstad', ht: 'kapital' },
  latitude: { en: 'latitude', es: 'latitud', nl: 'breedtegraad', ht: 'latitid' },
  longitude: { en: 'longitude', es: 'longitud', nl: 'lengtegraad', ht: 'lonjitid' },
  population: { en: 'population', es: 'población', nl: 'bevolking', ht: 'popilasyon' },
  superficie: { en: 'area', es: 'superficie', nl: 'oppervlakte', ht: 'sipèfisi' },
  densite: { fr: 'densité', en: 'density', es: 'densidad', nl: 'dichtheid', ht: 'dansite' },
  pib: { fr: 'PIB', en: 'GDP', es: 'PIB', nl: 'bbp', ht: 'PIB' },
  'point culminant': { en: 'highest point', es: 'punto más alto', nl: 'hoogste punt', ht: 'pwen ki pi wo' },
  altitude: { en: 'elevation', es: 'altitud', nl: 'hoogte', ht: 'altitid' },
  monnaie: { en: 'currency', es: 'moneda', nl: 'munt', ht: 'lajan' },
  langues: { en: 'languages', es: 'idiomas', nl: 'talen', ht: 'lang' },
  'indicatif telephonique': { fr: 'indicatif téléphonique', en: 'dialing code', es: 'prefijo telefónico', nl: 'landnummer', ht: 'endikatif telefòn' },
  'domaine internet': { en: 'internet domain', es: 'dominio de internet', nl: 'internetdomein', ht: 'domèn entènèt' },
  president: { fr: 'président', en: 'president', es: 'presidente', nl: 'president', ht: 'prezidan' },
  'premier ministre': { en: 'prime minister', es: 'primer ministro', nl: 'premier', ht: 'premye minis' },
  independance: { fr: 'indépendance', en: 'independence', es: 'independencia', nl: 'onafhankelijkheid', ht: 'endepandans' },
  'regime politique': { fr: 'régime politique', en: 'political system', es: 'régimen político', nl: 'politiek regime', ht: 'rejim politik' },
  organisations: { en: 'international organisations', es: 'organizaciones internacionales', nl: 'internationale organisaties', ht: 'òganizasyon entènasyonal' },
  religions: { en: 'religions', es: 'religiones', nl: 'religies', ht: 'relijyon' },
  drapeau: { en: 'flag', es: 'bandera', nl: 'vlag', ht: 'drapo' },
}

const units: DataI18n['units'] = {
  'Mds $': { en: 'bn $', es: 'mil M$', nl: 'mld $', ht: 'milya $' },
  'hab/km²': { en: 'pop./km²', nl: 'inw./km²', ht: 'moun/km²' }, // es : « hab/km² » identique
}

export const caribbeanI18n: DataI18n = { values, articles, columnLabels, units }
