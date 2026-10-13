import i18n, { type TFunction } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { AppError } from '../lib/errors'
import en from './en.json'
import vi from './vi.json'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
] as const
export type Language = (typeof LANGUAGES)[number]['code']

const LANGUAGE_KEY = 'nailpay.language'

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value)
}

/** The saved choice, else Vietnamese if the phone is set to it, else English. */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // storage blocked: fall through to the browser language
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(LANGUAGE_KEY, lng)
  } catch {
    // not saved; the choice lasts until the page is closed
  }
})

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React escapes
  initAsync: false, // resources are bundled, so be ready before the first render
})
document.documentElement.lang = i18n.language

/** A caught error as text in the current language. */
export function errorText(err: unknown, t: TFunction): string {
  return err instanceof AppError ? t(err.key, err.params) : (err as Error).message
}

export default i18n
