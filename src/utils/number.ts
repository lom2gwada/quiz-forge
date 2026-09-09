const FR = new Intl.NumberFormat('fr-FR')

/** Sépare les milliers à la française (« 11 190 000 »). Les nombres < 1000 sont inchangés. */
export function formatNumber(value: number): string {
  return Number.isFinite(value) ? FR.format(value) : String(value)
}

/** Valeur numérique d'un quiz : séparée par milliers, sauf les années (`isYear`) laissées brutes. */
export function formatNumericValue(value: number, isYear?: boolean): string {
  return isYear ? String(value) : formatNumber(value)
}
