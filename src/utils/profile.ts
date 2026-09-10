import type { Profile, Theme } from '../types/profile'
import { resolveLocale } from '../i18n/locale'

const KEY = 'quiz-forge:profile'

// Anciennes valeurs de thème (dark/light) migrées vers lagon/carte.
const LEGACY_THEME: Record<string, Theme> = { dark: 'lagon', light: 'carte' }

/** Profil stocké localement (par navigateur). Aucune synchronisation entre appareils. */
export async function fetchProfile(): Promise<Profile | null> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const profile = JSON.parse(raw) as Partial<Profile>
    return {
      pseudo: profile.pseudo ?? '',
      avatar: profile.avatar ?? '',
      theme: LEGACY_THEME[profile.theme ?? ''] ?? (profile.theme as Theme) ?? 'lagon',
      locale: resolveLocale(profile.locale), // profils d'avant l'i18n : locale déduite du navigateur
    }
  } catch {
    return null
  }
}

export async function saveProfile({ pseudo, avatar, theme, locale }: Profile): Promise<void> {
  try {
    localStorage.setItem(KEY, JSON.stringify({ pseudo, avatar, theme, locale }))
  } catch {
    /* quota dépassé ou navigation privée : on abandonne silencieusement */
  }
}
