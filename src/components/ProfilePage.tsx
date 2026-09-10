import { useState } from 'react'
import type { Profile, Theme } from '../types/profile'
import type { Locale } from '../i18n/locale'
import { LOCALE_LABELS, SUPPORTED_LOCALES, resolveLocale } from '../i18n/locale'
import { useT } from '../i18n'
import { playClick } from '../utils/sound'
import { applyTheme } from '../utils/theme'

export const AVATAR_OPTIONS = ['🙂', '😎', '🤓', '🦊', '🐱', '🐶', '🦁', '🐼', '🚀', '🎯', '⭐', '🔥']

interface ProfilePageProps {
  profile: Profile | null
  onBack: () => void
  onSave: (profile: Profile) => Promise<void>
  onViewHistory: () => void
}

export function ProfilePage({ profile, onBack, onSave, onViewHistory }: ProfilePageProps) {
  const t = useT()
  const [pseudo, setPseudo] = useState(profile?.pseudo ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATAR_OPTIONS[0])
  const [theme, setTheme] = useState<Theme>(profile?.theme ?? 'lagon')
  const [locale, setLocale] = useState<Locale>(profile?.locale ?? resolveLocale())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const previewTheme = (next: Theme) => { playClick(); setTheme(next); applyTheme(next); setSaved(false) }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      await onSave({ pseudo: pseudo.trim(), avatar, theme, locale })
      setSaved(true)
    } catch {
      setError(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return <section className="stats-page">
    <div className="stats-header">
      <h2>{t('profile.title')}</h2>
      <button type="button" className="secondary" onClick={onBack}>{t('common.back')}</button>
    </div>
    <div className="nav-links">
      <button type="button" className="secondary" onClick={onViewHistory}>🕓 {t('nav.history')}</button>
    </div>
    <form className="profile-form" onSubmit={submit}>
      <label>{t('profile.pseudo')}
        <input value={pseudo} onChange={(event) => { setPseudo(event.target.value); setSaved(false) }} required maxLength={30} placeholder={t('profile.pseudoPlaceholder')} />
      </label>
      <fieldset className="avatar-picker">
        <legend>{t('profile.avatar')}</legend>
        <div className="avatar-options">
          {AVATAR_OPTIONS.map((option) => <label key={option} className="avatar-option">
            <input type="radio" name="avatar" value={option} checked={avatar === option} onChange={() => { playClick(); setAvatar(option); setSaved(false) }} />
            <span>{option}</span>
          </label>)}
        </div>
      </fieldset>
      <label className="profile-language">{t('profile.language')}
        <select value={locale} onChange={(event) => { playClick(); setLocale(event.target.value); setSaved(false) }}>
          {SUPPORTED_LOCALES.map((code) => <option key={code} value={code}>{LOCALE_LABELS[code] ?? code}</option>)}
        </select>
      </label>
      <fieldset className="theme-picker">
        <legend>{t('profile.theme')}</legend>
        <div className="theme-options">
          <label className="theme-option">
            <input type="radio" name="theme" checked={theme === 'lagon'} onChange={() => previewTheme('lagon')} />
            {t('profile.themeLagon')}
          </label>
          <label className="theme-option">
            <input type="radio" name="theme" checked={theme === 'carte'} onChange={() => previewTheme('carte')} />
            {t('profile.themeCarte')}
          </label>
        </div>
      </fieldset>
      {error && <p className="alert" role="alert">{error}</p>}
      {saved && !error && <p className="profile-saved">{t('profile.saved')}</p>}
      <button type="submit" disabled={saving || !pseudo.trim()}>{saving ? t('common.saving') : t('common.save')}</button>
    </form>
  </section>
}
