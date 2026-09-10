const FR = new Intl.NumberFormat('fr-FR')

/** Sépare les milliers à la française (« 11 190 000 »). Les nombres < 1000 sont inchangés.
 * `Intl` fr-FR groupe avec une espace fine insécable (U+202F) quasi invisible aux petites tailles :
 * on la remplace par une espace insécable normale (U+00A0), lisible partout. */
export function formatNumber(value: number): string {
  return Number.isFinite(value) ? FR.format(value).replace(/ /g, ' ') : String(value)
}

/** Valeur numérique d'un quiz : séparée par milliers, sauf les années (`isYear`) laissées brutes. */
export function formatNumericValue(value: number, isYear?: boolean): string {
  return isYear ? String(value) : formatNumber(value)
}
