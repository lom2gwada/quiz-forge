import type { Profile } from '../types/profile'

const KEY = 'quiz-forge:profile'

/** Profil stocké localement (par navigateur). Aucune synchronisation entre appareils. */
export async function fetchProfile(): Promise<Profile | null> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
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
