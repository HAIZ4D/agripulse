import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'

const languages = [
  { code: 'ms', label: 'BM', full: 'Bahasa Melayu' },
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'zh', label: '中文', full: '中文 (Chinese)' },
  { code: 'ta', label: 'தமிழ்', full: 'தமிழ் (Tamil)' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = languages.find((l) => l.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const switchLang = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('agripulse-lang', code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all text-sm font-semibold text-foreground"
      >
        <Globe className="w-4 h-4 text-primary" />
        <span className="text-xs">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden z-[100] animate-fade-in">
          {languages.map((lang) => {
            const isActive = i18n.language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => switchLang(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/80 hover:bg-muted/50'
                }`}
              >
                <span className={`w-8 text-xs font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {lang.label}
                </span>
                <span className="flex-1 text-left text-sm">{lang.full}</span>
                {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
