import { DEFAULT_LOCALE, type Locale } from '../i18n/locale'

let currentLocale: Locale = DEFAULT_LOCALE
const cache = new Map<Locale, Intl.NumberFormat>()

/** Posé par `LocaleProvider` : la locale utilisée par `formatNumber` quand aucune n'est passée. */
export function setNumberLocale(locale: Locale): void {
  currentLocale = locale
}

function formatter(locale: Locale): Intl.NumberFormat {
  let nf = cache.get(locale)
  if (!nf) {
    nf = new Intl.NumberFormat(locale)
    cache.set(locale, nf)
  }
  return nf
}

/** Sépare les milliers selon la locale. Les nombres < 1000 sont inchangés.
 * En `fr`, `Intl` groupe avec une espace fine insécable (U+202F) quasi invisible aux petites
 * tailles → on la remplace par une insécable normale (U+00A0). No-op pour les autres locales. */
export function formatNumber(value: number, locale: Locale = currentLocale): string {
  if (!Number.isFinite(value)) return String(value)
  return formatter(locale).format(value).replace(/ /g, ' ')
}

/** Valeur numérique d'un quiz : séparée par milliers, sauf les années (`isYear`) laissées brutes. */
export function formatNumericValue(value: number, isYear?: boolean, locale?: Locale): string {
  return isYear ? String(value) : formatNumber(value, locale)
}
