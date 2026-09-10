import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { setNumberLocale } from '../utils/number'
import { DEFAULT_LOCALE, type Locale } from './locale'
import { fr, type MessageKey } from './messages/fr'
import { en } from './messages/en'
import { es } from './messages/es'
import { nl } from './messages/nl'
import { ht } from './messages/ht'

export type { MessageKey } from './messages/fr'
export type { Locale } from './locale'

const DICTS: Record<string, Partial<Record<MessageKey, string>>> = { fr, en, es, nl, ht }

export type TParams = Record<string, string | number>
export type TFunction = (key: MessageKey, params?: TParams) => string

function makeT(locale: Locale): TFunction {
  const dict = DICTS[locale] ?? {}
  return (key, params) => {
    let text = dict[key] ?? fr[key] ?? key
    if (import.meta.env.DEV && locale !== DEFAULT_LOCALE && dict[key] === undefined) {
      console.warn(`[i18n] clé « ${key} » absente pour « ${locale} » — repli fr`)
    }
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.split(`{${name}}`).join(String(value))
      }
    }
    return text
  }
}

interface LocaleContextValue {
  locale: Locale
  t: TFunction
}

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE, t: makeT(DEFAULT_LOCALE) })

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  // Aligne le formateur de nombres (module, non-React) sur la locale, avant le rendu des enfants.
  setNumberLocale(locale)
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useT(): TFunction {
  return useContext(LocaleContext).t
}

/** Traducteur hors React (helpers purs, tests). Préférer `useT()` dans les composants. */
export function getT(locale: Locale = DEFAULT_LOCALE): TFunction {
  return makeT(locale)
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}

/** Pour un compteur : renvoie la bonne clé `.one` / `.other`. */
export function plural(key: 'start.count' | 'filter.selected', n: number): MessageKey {
  return `${key}.${n === 1 ? 'one' : 'other'}` as MessageKey
}
