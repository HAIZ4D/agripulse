import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ms from './ms.json'
import en from './en.json'
import zh from './zh.json'
import ta from './ta.json'

i18n.use(initReactI18next).init({
  resources: {
    ms: { translation: ms },
    en: { translation: en },
    zh: { translation: zh },
    ta: { translation: ta },
  },
  lng: localStorage.getItem('agripulse-lang') || 'ms',
  fallbackLng: 'ms',
  interpolation: { escapeValue: false },
})

export default i18n
