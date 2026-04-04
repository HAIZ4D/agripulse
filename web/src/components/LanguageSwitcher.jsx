import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'ms', label: 'BM' },
  { code: 'en', label: 'EN' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const switchLang = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('agripulse-lang', code)
  }

  return (
    <div className="flex items-center gap-1">
      <Globe className="w-4 h-4 text-muted-foreground" />
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => switchLang(lang.code)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            i18n.language === lang.code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
