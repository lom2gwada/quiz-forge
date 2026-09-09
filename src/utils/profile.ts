import type { Profile, Theme } from '../types/profile'

const KEY = 'quiz-forge:profile'

// Anciennes valeurs de thème (dark/light) migrées vers lagon/carte.
const LEGACY_THEME: Record<string, Theme> = { dark: 'lagon', light: 'carte' }

/** Profil stocké localement (par navigateur). Aucune synchronisation entre appareils. */
export async function fetchProfile(): Promise<Profile | null> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const profile = JSON.parse(raw) as Profile
    return { ...profile, theme: LEGACY_THEME[profile.theme] ?? profile.theme }
  } catch {
    return null
  }
}

export async function saveProfile({ pseudo, avatar, theme }: Profile): Promise<void> {
  try {
    localStorage.setItem(KEY, JSON.stringify({ pseudo, avatar, theme }))
  } catch {
    /* quota dépassé ou navigation privée : on abandonne silencieusement */
  }
}
