import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

/** English / Tiếng Việt switch. Each language is labeled in itself so it's findable from either. */
export default function LanguageToggle() {
  const { t, i18n } = useTranslation()

  return (
    <div role="group" aria-label={t('language')} className="flex rounded-full bg-white/15 p-0.5 text-sm">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          onClick={() => i18n.changeLanguage(code)}
          aria-pressed={i18n.language === code}
          className="rounded-full px-3 py-1.5 font-medium text-white/80 aria-pressed:bg-white aria-pressed:text-pink-700"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
